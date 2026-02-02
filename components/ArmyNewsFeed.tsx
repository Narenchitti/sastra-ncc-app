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

    useEffect(() => {
        async function loadNews() {
            const data = await getArmyNews();
            // Fallback mock data if RSS fails (common in dev environments due to CORS/Network)
            if (!data || data.length === 0) {
                setNews([
                    {
                        title: "Indian Army conducts training exercise 'Trishakti Prahar' in North Bengal",
                        pubDate: new Date().toUTCString(),
                        content: "The exercise was aimed at validating battle preparedness of the Security Forces using latest weapons and equipment in a networked environment.",
                        link: "https://indianarmy.nic.in",
                        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Indian_Army_soldiers_during_Exercise_Yudh_Abhyas_2015.jpg/1200px-Indian_Army_soldiers_during_Exercise_Yudh_Abhyas_2015.jpg"
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
            setLoading(false);
        }
        loadNews();
    }, []);

    if (loading) return <div className="p-4 text-center text-gray-500 animate-pulse">Loading Army News...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white flex justify-between items-center">
                <h3 className="font-heading text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Indian Army News
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    LIVE UPDATES
                </span>
            </div>

            <div className="divide-y divide-gray-100">
                {news.map((item, i) => (
                    <article key={i} className="p-4 hover:bg-gray-50 transition-colors group flex gap-4">
                        {/* Image Thumbnail (or Placeholder) */}
                        <div className="flex-shrink-0 w-24 h-24 bg-gray-200 rounded-lg overflow-hidden relative">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt="News" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                    <i className="fas fa-newspaper text-2xl"></i>
                                </div>
                            )}
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

                        <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={item.link} target="_blank" className="text-gray-400 hover:text-ncc-red p-2">
                                <i className="fas fa-chevron-right"></i>
                            </a>
                        </div>
                    </article>
                ))}
            </div>
            <div className="bg-gray-50 p-2 text-center">
                <a href="https://indianarmy.nic.in" target="_blank" className="text-xs font-bold text-gray-500 hover:text-red-600 uppercase tracking-widest">
                    View Official Army Site <i className="fas fa-external-link-alt ml-1"></i>
                </a>
            </div>
        </div>
    );
}
