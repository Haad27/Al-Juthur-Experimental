import React, { useEffect, useState } from "react";

const useScrollDirection = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let previousScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const diff = currentScrollY - previousScrollY;

          // Only toggle if scrolled more than 10px to prevent jitter on laptop trackpads and wheels
          if (Math.abs(diff) > 10) {
            if (diff > 0 && currentScrollY > 100) {
              setShow(false);
            } else if (diff < 0) {
              setShow(true);
            }
            previousScrollY = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return show;
};

export default useScrollDirection;
