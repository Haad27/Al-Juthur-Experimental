import { useEffect, useState, useRef } from "react";

const useScrollDirection = () => {
  const [show, setShow] = useState(true);
  const lastScrollY = useRef(0);
  const accumulativeDelta = useRef(0);

  useEffect(() => {
    lastScrollY.current = typeof window !== "undefined" ? window.scrollY : 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show near the top of the page (and ignore iOS overscroll < 0)
      if (currentScrollY <= 60) {
        setShow(true);
        accumulativeDelta.current = 0;
        lastScrollY.current = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      // Reset accumulator if scroll direction flips
      if ((delta > 0 && accumulativeDelta.current < 0) || (delta < 0 && accumulativeDelta.current > 0)) {
        accumulativeDelta.current = delta;
      } else {
        accumulativeDelta.current += delta;
      }

      // Require sustained 25px scrolling in either direction to trigger state change
      if (accumulativeDelta.current > 25) {
        setShow(false);
        accumulativeDelta.current = 0;
      } else if (accumulativeDelta.current < -25) {
        setShow(true);
        accumulativeDelta.current = 0;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return show;
};

export default useScrollDirection;
