import { useEffect, useState } from 'react';

const useCurrentTime = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 30000);

        return () => clearInterval(timer);
    }, []);

    return now;
};

export default useCurrentTime;
