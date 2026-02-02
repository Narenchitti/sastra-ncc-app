'use client';

import { useEffect, useState } from 'react';
import { getArmyNews } from '@/app/actions';

interface NewsItem {
    title?: string;
    link?: string;
    pubDate?: string;
    content?: string;
    imageUrl?: string | null;
}

export default function ArmyNewsFeed() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Reliable Fallback Images (Indian Army / Defence Themed - Public Domain/Unsplash)
    const FALLBACK_IMAGES = [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Indian_Army_Republic_Day_2013.jpg/800px-Indian_Army_Republic_Day_2013.jpg", // Marching
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Indian_Army_T-90_Bhishma_Tank.jpg/800px-Indian_Army_T-90_Bhishma_Tank.jpg", // Tank
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Indian_Army_Special_Forces_soldier_with_Tavor_TAR-21.jpg/600px-Indian_Army_Special_Forces_soldier_with_Tavor_TAR-21.jpg", // Soldier
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Indian_Army_during_Exercise_Yudh_Abhyas_2013.jpg/800px-Indian_Army_during_Exercise_Yudh_Abhyas_2013.jpg", // Patrolling
    ];

    // Helper to get a deterministic image based on title string
    const getFallbackImage = (title: string = '') => {
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            hash = title.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % FALLBACK_IMAGES.length;
        return FALLBACK_IMAGES[index];
    };

    useEffect(() => {
        async function loadNews() {
            try {
                const data = await getArmyNews();
                // Fallback mock data if RSS fails (common in dev environments due to CORS/Network)
                if (!data || data.length === 0) {
                    setNews([
                        {
                            title: "Indian Army conducts training exercise 'Trishakti Prahar' in North Bengal",
                            pubDate: new Date().toUTCString(),
                            content: "The exercise was aimed at validating battle preparedness of the Security Forces using latest weapons and equipment in a networked environment.",
                            link: "https://indianarmy.nic.in",
                            imageUrl: null // Let it use the deterministic fallback
                        },
                        {
                            title: "Defence Minister visits forward areas in Arunachal Pradesh",
                            pubDate: new Date(Date.now() - 86400000).toUTCString(),
                            content: "Reviewing the operational preparedness involved detailed discussions with field commanders on the ground.",
                            link: "https://pib.gov.in",
                            imageUrl: null
                        }
                    ]);
                } else {
                    setNews(data);
                }
            } catch (e) {
                console.error("Failed to load news", e);
            } finally {
                setLoading(false);
            }
        }
        loadNews();
    }, []);

    if (loading) return <div className="p-4 text-center text-xs text-gray-500 animate-pulse">Loading Army News...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex justify-between items-center">
                <h3 className="font-heading text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Indian Army News
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    LIVE UPDATES
                </span>
            </div>

            <div className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[400px]">
                {news.map((item, i) => (
                    <article key={i} className="p-4 hover:bg-gray-50 transition-colors group flex gap-4">
                        {/* Image Thumbnail (or Placeholder) */}
                        <div className="flex-shrink-0 w-24 h-24 bg-gray-200 rounded-lg overflow-hidden relative">
                            <img
                                src={item.imageUrl || getFallbackImage(item.title)}
                                alt="News"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = getFallbackImage(item.title);
                                }}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="block group-hover:text-ncc-red transition-colors">
                                <h4 className="font-bold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">
                                    {item.title}
                                </h4>
                            </a>
                            <div className="text-xs text-gray-400 mb-2">{item.pubDate ? new Date(item.pubDate).toDateString() : ''} • Source: Govt of India</div>
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                {item.content ? item.content.replace(/<[^>]*>?/gm, '') : 'Click to read full coverage...'}
                            </p>
                        </div>

                        <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                            <a href={item.link} target="_blank" className="text-gray-400 hover:text-ncc-red p-2">
                                <i className="fas fa-chevron-right"></i>
                            </a>
                        </div>
                    </article>
                ))}
            </div>
            <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
                <a href="https://indianarmy.nic.in" target="_blank" className="text-xs font-bold text-gray-500 hover:text-red-600 uppercase tracking-widest transition-colors">
                    View Official Army Site <i className="fas fa-external-link-alt ml-1"></i>
                </a>
            </div>
        </div>
    );
}
