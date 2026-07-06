import { getAiInvoiceGenerationPrice } from "@/modules/ai-invoice/constants";
import { AiInvoiceGenerator } from "@/components/ai-invoice/ai-invoice-generator";

export default function AiInvoiceGeneratorPage() {
  return <AiInvoiceGenerator price={getAiInvoiceGenerationPrice()} />;
}
