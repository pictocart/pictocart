import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '919810189606';
const DEFAULT_MESSAGE = 'Need Support? Contact Us';

const WhatsAppFloat = () => {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] flex items-center justify-center h-14 w-14 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-transform"
      style={{ backgroundColor: '#25D366' }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="#fff" aria-hidden="true">
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.337-.688.717-1.032 1.462-1.06 2.473v.143c-.015.99.41 1.96.94 2.78 1.31 2.018 2.95 3.61 5.05 4.69.61.31 2.97 1.366 3.66 1.366.55 0 1.91-.7 2.14-1.205.215-.515.215-.953.143-1.04-.1-.115-.27-.17-.53-.3-.26-.115-1.59-.785-1.84-.87Z"/>
        <path d="M16.003.999c-8.286 0-15.001 6.715-15.001 15a14.96 14.96 0 0 0 2.001 7.503L1 31l7.687-2.013a14.93 14.93 0 0 0 7.316 1.917h.006c8.281 0 15.012-6.714 15.012-14.998C31.02 7.715 24.286 1 16.003 1Zm0 27.46h-.005a12.46 12.46 0 0 1-6.349-1.738l-.455-.27-4.564 1.197 1.219-4.45-.297-.46a12.42 12.42 0 0 1-1.9-6.638c.001-6.876 5.586-12.46 12.46-12.46a12.38 12.38 0 0 1 8.81 3.652 12.38 12.38 0 0 1 3.643 8.813c-.003 6.876-5.588 12.454-12.462 12.454Z"/>
      </svg>
    </a>
  );
};

export default WhatsAppFloat;
