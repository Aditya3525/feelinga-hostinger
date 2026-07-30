'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function useFadeIn() {
    const pathname = usePathname();

    useEffect(() => {
        // Small delay to ensure DOM is fully rendered after navigation
        const timer = setTimeout(() => {
            const animClasses = '.fade-in:not(.visible), .slide-in-left:not(.visible), .slide-in-right:not(.visible), .scale-in:not(.visible), .blur-in:not(.visible)';

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) entry.target.classList.add('visible');
                    });
                },
                { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
            );

            const elements = document.querySelectorAll(animClasses);
            elements.forEach((el) => observer.observe(el));

            // Also watch for dynamically added elements
            const mutationObserver = new MutationObserver(() => {
                const newElements = document.querySelectorAll(animClasses);
                newElements.forEach((el) => observer.observe(el));
            });
            mutationObserver.observe(document.body, { childList: true, subtree: true });

            // Header scroll effect
            const header = document.getElementById('header');
            if (header) {
                const onScroll = () => {
                    if (window.scrollY > 20) {
                        header.classList.add('scrolled');
                    } else {
                        header.classList.remove('scrolled');
                    }
                };
                window.addEventListener('scroll', onScroll, { passive: true });
                onScroll(); // check initial state
            }

            return () => {
                observer.disconnect();
                mutationObserver.disconnect();
            };
        }, 100);

        return () => clearTimeout(timer);
    }, [pathname]); // Re-run on route changes
}
