import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Slide {
  id: string;
  image_url: string | null;
  caption: string | null;
  duration_seconds: number | null;
  order_index: number;
  is_active: boolean;
}

interface SignagePlayerProps {
  slides: Slide[];
  defaultDuration: number;
  shuffle: boolean;
  transitionStyle: "fade" | "cut";
  className?: string;
}

export function SignagePlayer({ slides, defaultDuration, shuffle, transitionStyle, className }: SignagePlayerProps) {
  const activeSlides = slides.filter(s => s.is_active && s.image_url);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Build play order
  useEffect(() => {
    if (!activeSlides.length) return;
    const indices = activeSlides.map((_, i) => i);
    if (shuffle) {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }
    setOrder(indices);
    setCurrentIndex(0);
  }, [activeSlides.length, shuffle]);

  const advance = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % (order.length || 1));
  }, [order.length]);

  useEffect(() => {
    if (!order.length || !activeSlides.length) return;
    const slideIdx = order[currentIndex % order.length];
    const slide = activeSlides[slideIdx];
    const duration = (slide?.duration_seconds || defaultDuration) * 1000;
    timerRef.current = setTimeout(advance, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIndex, order, activeSlides, defaultDuration, advance]);

  if (!activeSlides.length || !order.length) return null;

  const slideIdx = order[currentIndex % order.length];
  const currentSlide = activeSlides[slideIdx];
  if (!currentSlide?.image_url) return null;

  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const cutVariants = {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const variants = transitionStyle === "fade" ? fadeVariants : cutVariants;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className || ""}`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={currentSlide.id + "-" + currentIndex}
          src={currentSlide.image_url}
          alt={currentSlide.caption || ""}
          className="absolute inset-0 w-full h-full object-cover"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: transitionStyle === "fade" ? 1 : 0.1 }}
        />
      </AnimatePresence>
      {currentSlide.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <p className="text-white text-lg font-medium">{currentSlide.caption}</p>
        </div>
      )}
    </div>
  );
}
