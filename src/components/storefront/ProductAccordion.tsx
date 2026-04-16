import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Props {
  description?: string | null;
  highlights?: string[];
  metadata?: Record<string, string>;
  colors: any;
  fonts: any;
}

const ProductAccordion = ({ description, highlights, metadata, colors, fonts }: Props) => {
  const metaEntries = metadata ? Object.entries(metadata).filter(([, v]) => v) : [];

  return (
    <Accordion type="multiple" defaultValue={['description']} className="w-full">
      {description && (
        <AccordionItem value="description" style={{ borderColor: colors.secondary }}>
          <AccordionTrigger className="text-sm font-semibold hover:no-underline" style={{ fontFamily: fonts.heading }}>
            Description
          </AccordionTrigger>
          <AccordionContent>
            {highlights && highlights.length > 0 && (
              <ul className="space-y-2 mb-4">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                    <span className="opacity-80">{h}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-sm opacity-70 whitespace-pre-wrap">{description}</div>
          </AccordionContent>
        </AccordionItem>
      )}

      {metaEntries.length > 0 && (
        <AccordionItem value="additional" style={{ borderColor: colors.secondary }}>
          <AccordionTrigger className="text-sm font-semibold hover:no-underline" style={{ fontFamily: fonts.heading }}>
            Additional Information
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {metaEntries.map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}: </span>
                  <span className="opacity-70">{value}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      <AccordionItem value="shipping" style={{ borderColor: colors.secondary }}>
        <AccordionTrigger className="text-sm font-semibold hover:no-underline" style={{ fontFamily: fonts.heading }}>
          Shipping & Returns
        </AccordionTrigger>
        <AccordionContent>
          <div className="text-sm opacity-70 space-y-2">
            <p>• Free shipping on orders above ₹499</p>
            <p>• Standard delivery: 5-7 business days</p>
            <p>• Express delivery available at checkout</p>
            <p>• Easy 7-day return & exchange policy</p>
            <p>• Cash on Delivery available for eligible pincodes</p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ProductAccordion;
