# DokMaker Supabase Auth Integration Guide

**Version:** v1.0  
**Status:** Final auth provider decision  
**Auth provider:** Supabase Auth  
**Docs:** https://supabase.com/docs/guides/auth

---

## 1. Keputusan

DokMaker menggunakan **Supabase Auth** sebagai auth provider utama.

### Alasan
- terintegrasi langsung dengan PostgreSQL yang sudah dipilih
- Row Level Security (RLS) bisa dipakai untuk data isolation
- free tier 50K MAU lebih besar dari Clerk (10K MAU)
- lebih kontrol atas session/cookie untuk PWA iOS
- less vendor lock-in karena open-source
- stack alignment dengan PostgreSQL

---

## 2. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Security notes:**
- `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` boleh exposed ke client
- `SUPABASE_SERVICE_ROLE_KEY` hanya untuk server-side operations, jangan expose ke client

---

## 3. Setup steps

### 3.1 Create Supabase project
1. Login ke https://supabase.com
2. Create new project
3. Catat project URL dan anon key
4. Catat service role key (Settings > API)

### 3.2 Enable auth providers
1. Buka Authentication > Providers
2. Enable Email provider
3. Configure redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (development)

### 3.3 Configure email templates (opsional)
- Confirm signup
- Reset password
- Magic link

---

## 4. Implementation architecture

### 4.1 Client-side Supabase
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 4.2 Server-side Supabase
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### 4.3 Middleware
```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Redirect unauthenticated users to login
  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  
  return supabaseResponse
}
```

---

## 5. Auth flow

### 5.1 Register
1. User submits email + password
2. Supabase creates auth user
3. App creates local `users` record
4. App creates `wallets` record
5. User redirected to `/app`

### 5.2 Login
1. User submits email + password
2. Supabase returns session
3. App syncs user data if needed
4. User redirected to `/app`

### 5.3 Logout
1. User clicks logout
2. Supabase clears session
3. User redirected to `/login`

### 5.4 Password reset
1. User requests reset
2. Supabase sends email
3. User clicks link
4. User sets new password
5. Session created

---

## 6. PWA iOS handling

### Problem
iOS PWA runs in separate browser context from Safari. Cookies and session storage are isolated.

### Solution
1. Use Supabase auth state listener
2. Persist auth state in PWA-local storage
3. Handle auth state recovery on PWA launch
4. Implement proper redirect handling

### Implementation
```typescript
// In your auth context/provider
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    if (event === 'SIGNED_IN') {
      // Handle signed in state
    } else if (event === 'SIGNED_OUT') {
      // Handle signed out state
    }
  }
)
```

---

## 7. Row Level Security (RLS)

### 7.1 Enable RLS on tables
```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger_entries ENABLE ROW LEVEL SECURITY;
```

### 7.2 Create policies
```sql
-- Invoices: users can only access their own
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallets: users can only access their own
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Admin bypass
CREATE POLICY "Admins can access all" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
```

---

## 8. Server-side helpers

```typescript
// src/modules/auth/session.ts
import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  
  // Check admin role from local users table
  const { data: localUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (localUser?.role !== 'admin') {
    throw new Error('Forbidden')
  }
  
  return user
}
```

---

## 9. Syncing Supabase auth users with local users table

### 9.1 Webhook approach
Use Supabase webhooks to sync user creation/updates to local `users` table.

### 9.2 On-demand approach
Sync user data on first login or when user data is needed.

### 9.3 Recommended
Use on-demand approach for MVP:
1. On login, check if user exists in local `users` table
2. If not, create local user record
3. If yes, update last_login_at

---

## 10. Testing checklist

- [ ] Register creates Supabase auth user
- [ ] Register creates local users record
- [ ] Register creates wallets record
- [ ] Login works with email/password
- [ ] Logout clears session
- [ ] Guest cannot access /app
- [ ] Guest cannot access /admin
- [ ] User cannot access /admin
- [ ] Admin can access /admin
- [ ] Password reset email sent
- [ ] Password reset works
- [ ] PWA retains auth state
- [ ] iOS PWA auth works correctly

---

## 11. Security considerations

1. Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
2. Use `getUser()` server-side, not `getSession()`
3. Implement RLS for data isolation
4. Validate auth state on every sensitive server action
5. Handle token refresh properly
6. Log auth events for audit
