import { useEffect, useState } from 'react';

type CounterResult = {
    count: string;
    start: () => void;
};

export default function useCounter(target: number, suffix = ''): CounterResult {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        if (!started) return;

        let startTime = 0;
        const duration = 2000;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
    }, [started, target]);

    return {
        count: `${count}${suffix}`,
        start: () => setStarted(true),
    };
}
