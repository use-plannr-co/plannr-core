import { useState, useEffect } from 'react';

/**
 * Daily Motivational Quotes Hook
 *
 * This hook provides a daily quote that changes at midnight (12:00 AM) local time.
 * The quote is selected based on the current date to ensure consistency throughout the day
 * and changes automatically at midnight.
 *
 * Features:
 * - 80+ carefully curated motivational quotes
 * - Automatically changes at midnight local time
 * - Deterministic selection based on date (same quote all day)
 * - Covers themes: productivity, success, perseverance, time management, goals
 *
 * Usage:
 * const { quote, author } = useQuote();
 */

const MOTIVATIONAL_QUOTES = [
    // Productivity & Time Management
    { quote: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
    { quote: 'Time is what we want most, but what we use worst.', author: 'William Penn' },
    {
        quote: 'Productivity is never an accident. It is always the result of a commitment to excellence.',
        author: 'Paul J. Meyer',
    },
    { quote: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' },
    {
        quote: "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
        author: 'Stephen Covey',
    },
    { quote: 'Time management is life management.', author: 'Robin Sharma' },
    {
        quote: "You don't have to be great to get started, but you have to get started to be great.",
        author: 'Les Brown',
    },
    { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },

    // Success & Achievement
    {
        quote: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
        author: 'Winston Churchill',
    },
    { quote: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' },
    {
        quote: 'Success is walking from failure to failure with no loss of enthusiasm.',
        author: 'Winston Churchill',
    },
    {
        quote: "Don't be afraid to give up the good to go for the great.",
        author: 'John D. Rockefeller',
    },
    { quote: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    {
        quote: 'Success is not the key to happiness. Happiness is the key to success.',
        author: 'Albert Schweitzer',
    },
    {
        quote: 'The future belongs to those who believe in the beauty of their dreams.',
        author: 'Eleanor Roosevelt',
    },
    {
        quote: 'Success is the sum of small efforts repeated day in and day out.',
        author: 'Robert Collier',
    },

    // Perseverance & Growth
    {
        quote: 'It is during our darkest moments that we must focus to see the light.',
        author: 'Aristotle',
    },
    {
        quote: 'The only person you are destined to become is the person you decide to be.',
        author: 'Ralph Waldo Emerson',
    },
    { quote: "Believe you can and you're halfway there.", author: 'Theodore Roosevelt' },
    {
        quote: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.',
        author: 'Ralph Waldo Emerson',
    },
    {
        quote: 'The greatest glory in living lies not in never falling, but in rising every time we fall.',
        author: 'Nelson Mandela',
    },
    {
        quote: "Life is what happens to you while you're busy making other plans.",
        author: 'John Lennon',
    },
    {
        quote: 'The only way to make sense out of change is to plunge into it, move with it, and join the dance.',
        author: 'Alan Watts',
    },
    { quote: 'Be yourself; everyone else is already taken.', author: 'Oscar Wilde' },

    // Goals & Planning
    { quote: 'A goal is a dream with a deadline.', author: 'Napoleon Hill' },
    { quote: 'If you fail to plan, you are planning to fail.', author: 'Benjamin Franklin' },
    {
        quote: 'The trouble with not having a goal is that you can spend your life running up and down the field and never score.',
        author: 'Bill Copeland',
    },
    { quote: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
    {
        quote: 'You are never too old to set another goal or to dream a new dream.',
        author: 'C.S. Lewis',
    },
    {
        quote: 'Setting goals is the first step in turning the invisible into the visible.',
        author: 'Tony Robbins',
    },
    {
        quote: 'The best time to plant a tree was 20 years ago. The second best time is now.',
        author: 'Chinese Proverb',
    },
    { quote: "Dreams don't work unless you do.", author: 'John C. Maxwell' },

    // Innovation & Creativity
    { quote: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
    { quote: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
    { quote: 'Creativity is intelligence having fun.', author: 'Albert Einstein' },
    {
        quote: 'The only way to discover the limits of the possible is to go beyond them into the impossible.',
        author: 'Arthur C. Clarke',
    },
    { quote: 'Innovation is the outcome of a habit, not a random act.', author: 'Sukant Ratnakar' },
    { quote: 'Ideas are easy. Implementation is hard.', author: 'Guy Kawasaki' },
    { quote: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
    { quote: "Don't wait for opportunity. Create it.", author: 'George Bernard Shaw' },

    // Mindset & Attitude
    {
        quote: 'Your attitude, not your aptitude, will determine your altitude.',
        author: 'Zig Ziglar',
    },
    {
        quote: "Whether you think you can or you think you can't, you're right.",
        author: 'Henry Ford',
    },
    { quote: 'The mind is everything. What you think you become.', author: 'Buddha' },
    { quote: 'Positive anything is better than negative nothing.', author: 'Elbert Hubbard' },
    {
        quote: 'Life is 10% what happens to you and 90% how you react to it.',
        author: 'Charles R. Swindoll',
    },
    {
        quote: 'The only limit to our realization of tomorrow will be our doubts of today.',
        author: 'Franklin D. Roosevelt',
    },
    { quote: 'Optimism is the faith that leads to achievement.', author: 'Helen Keller' },
    {
        quote: 'Keep your face always toward the sunshine—and shadows will fall behind you.',
        author: 'Walt Whitman',
    },

    // Action & Progress
    { quote: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
    {
        quote: "You don't have to see the whole staircase, just take the first step.",
        author: 'Martin Luther King Jr.',
    },
    { quote: 'Progress, not perfection.', author: 'Unknown' },
    { quote: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
    { quote: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
    { quote: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
    { quote: 'A little progress each day adds up to big results.', author: 'Satya Nani' },
    {
        quote: 'Small steps in the right direction can turn out to be the biggest step of your life.',
        author: 'Naeem Callaway',
    },

    // Leadership & Influence
    {
        quote: 'The greatest leader is not necessarily the one who does the greatest things, but the one that gets the people to do the greatest things.',
        author: 'Ronald Reagan',
    },
    {
        quote: 'A leader is one who knows the way, goes the way, and shows the way.',
        author: 'John C. Maxwell',
    },
    {
        quote: "Leadership is not about being in charge. It's about taking care of those in your charge.",
        author: 'Simon Sinek',
    },
    {
        quote: 'The art of leadership is saying no, not saying yes. It is very easy to say yes.',
        author: 'Tony Blair',
    },
    {
        quote: 'Leadership is the capacity to translate vision into reality.',
        author: 'Warren Bennis',
    },
    {
        quote: 'The function of leadership is to produce more leaders, not more followers.',
        author: 'Ralph Nader',
    },

    // Learning & Growth
    {
        quote: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
        author: 'Mahatma Gandhi',
    },
    {
        quote: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
        author: 'Dr. Seuss',
    },
    { quote: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' },
    { quote: 'The only thing that is constant is change.', author: 'Heraclitus' },
    {
        quote: 'Education is the most powerful weapon which you can use to change the world.',
        author: 'Nelson Mandela',
    },
    { quote: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
    { quote: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
    {
        quote: 'Learning is a treasure that will follow its owner everywhere.',
        author: 'Chinese Proverb',
    },

    // Persistence & Resilience
    {
        quote: 'It does not matter how slowly you go as long as you do not stop.',
        author: 'Confucius',
    },
    { quote: 'Fall seven times, rise eight.', author: 'Japanese Proverb' },
    {
        quote: 'The difference between ordinary and extraordinary is that little extra.',
        author: 'Jimmy Johnson',
    },
    {
        quote: 'Persistence is the hard work you do after you get tired of doing the hard work you already did.',
        author: 'Newt Gingrich',
    },
    {
        quote: 'Rivers know this: there is no hurry. We shall get there some day.',
        author: 'A.A. Milne',
    },
    { quote: 'Champions keep playing until they get it right.', author: 'Billie Jean King' },
    {
        quote: 'Success is the ability to go from failure to failure without losing your enthusiasm.',
        author: 'Winston Churchill',
    },
    {
        quote: "The only thing standing between you and your goal is the story you keep telling yourself as to why you can't achieve it.",
        author: 'Jordan Belfort',
    },

    // Balance & Well-being
    { quote: 'Take time to make your soul happy.', author: 'Unknown' },
    {
        quote: "Balance is not something you find, it's something you create.",
        author: 'Jana Kingsford',
    },
    {
        quote: 'Happiness is not something ready made. It comes from your own actions.',
        author: 'Dalai Lama',
    },
    { quote: 'The greatest wealth is health.', author: 'Virgil' },
    {
        quote: "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit.",
        author: 'Ralph Marston',
    },
    {
        quote: 'Self-care is not selfish. You cannot serve from an empty vessel.',
        author: 'Eleanor Brown',
    },
    { quote: 'The groundwork for all happiness is good health.', author: 'Leigh Hunt' },
    { quote: 'Peace comes from within. Do not seek it without.', author: 'Buddha' },

    // Inspiration & Motivation
    {
        quote: 'The only person you are destined to become is the person you decide to be.',
        author: 'Ralph Waldo Emerson',
    },
    { quote: 'What we achieve inwardly will change outer reality.', author: 'Plutarch' },
    { quote: 'Be the change that you wish to see in the world.', author: 'Mahatma Gandhi' },
    { quote: 'The best revenge is massive success.', author: 'Frank Sinatra' },
    {
        quote: 'Life is really simple, but we insist on making it complicated.',
        author: 'Confucius',
    },
    { quote: 'The purpose of our lives is to be happy.', author: 'Dalai Lama' },
    {
        quote: 'In the end, we will remember not the words of our enemies, but the silence of our friends.',
        author: 'Martin Luther King Jr.',
    },
    {
        quote: 'The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart.',
        author: 'Helen Keller',
    },
];

/**
 * Gets a deterministic quote based on the current date
 * This ensures the same quote is shown all day until midnight
 */
const getQuoteForDate = (date) => {
    // Create a simple hash from the date string to get consistent randomness
    const dateString = date.toDateString();
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Use absolute value and modulo to get index
    const index = Math.abs(hash) % MOTIVATIONAL_QUOTES.length;
    return MOTIVATIONAL_QUOTES[index];
};

/**
 * Gets the current date at midnight to ensure quote changes at 12:00 AM
 */
const getCurrentDateAtMidnight = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/**
 * Custom hook for daily motivational quotes
 */
export const useQuote = () => {
    const [currentQuote, setCurrentQuote] = useState(() =>
        getQuoteForDate(getCurrentDateAtMidnight()),
    );

    useEffect(() => {
        // Update quote immediately in case date has changed
        const updateQuote = () => {
            const newQuote = getQuoteForDate(getCurrentDateAtMidnight());
            setCurrentQuote(newQuote);
        };

        // Calculate time until next midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();

        // Set initial timeout to midnight
        const timeoutId = setTimeout(() => {
            updateQuote();

            // Then set up daily interval
            const intervalId = setInterval(updateQuote, 24 * 60 * 60 * 1000); // 24 hours

            // Store interval ID for cleanup
            timeoutId._intervalId = intervalId;
        }, timeUntilMidnight);

        // Cleanup function
        return () => {
            clearTimeout(timeoutId);
            if (timeoutId._intervalId) {
                clearInterval(timeoutId._intervalId);
            }
        };
    }, []);

    return {
        quote: currentQuote.quote,
        author: currentQuote.author,
        // Utility function to get a random quote (for testing or manual refresh)
        getRandomQuote: () => {
            const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
            return MOTIVATIONAL_QUOTES[randomIndex];
        },
        // Get total number of quotes available
        totalQuotes: MOTIVATIONAL_QUOTES.length,
    };
};

export default useQuote;
