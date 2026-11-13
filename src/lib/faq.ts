/**
 * Shared FAQ content. Rendered on the homepage and also used to ground the AI support chatbot,
 * so a single edit here keeps the public answers and the assistant in step.
 */
export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "Do I need a prescription to order?",
    a: "Only for prescription medicines (marked Rx). Upload a valid prescription from a registered doctor and our pharmacist will verify it before your order is packed. Over-the-counter products can be ordered directly.",
  },
  {
    q: "How fast will my order arrive?",
    a: "Delivery times depend on your pincode and the time of order. You will see the estimated delivery slot at checkout.",
  },
  {
    q: "Are the medicines genuine?",
    a: "We source from licensed distributors and manufacturers. Every order is checked by a pharmacist, and batch and expiry details are verified before dispatch.",
  },
  {
    q: "Can I return or cancel an order?",
    a: "You can cancel before dispatch. Because of safety rules, medicines can be returned only if they are damaged, expired or incorrect. Full policy details will be published before launch.",
  },
];
