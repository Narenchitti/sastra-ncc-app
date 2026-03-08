'use client';

import { useEffect, useCallback } from 'react';

interface GalleryLightboxProps {
    images: { src: string; alt: string; category: string }[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

export default function GalleryLightbox({
    images,
    currentIndex,
    onClose,
    onNavigate,
}: GalleryLightboxProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onNavigate(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
            if (e.key === 'ArrowRight') onNavigate(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
        },
        [currentIndex, images.length, onClose, onNavigate]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    const image = images[currentIndex];

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white/70 hover:text-white text-3xl z-10 transition-colors"
            >
                <i className="fas fa-times"></i>
            </button>

            {/* Counter */}
            <div className="absolute top-6 left-6 text-white/50 text-sm font-bold">
                {currentIndex + 1} / {images.length}
            </div>

            {/* Previous */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
                }}
                className="absolute left-4 md:left-8 text-white/50 hover:text-white text-4xl z-10 transition-colors"
            >
                <i className="fas fa-chevron-left"></i>
            </button>

            {/* Image */}
            <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <img
                    src={image.src}
                    alt={image.alt}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
            </div>

            {/* Next */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
                }}
                className="absolute right-4 md:right-8 text-white/50 hover:text-white text-4xl z-10 transition-colors"
            >
                <i className="fas fa-chevron-right"></i>
            </button>

            {/* Caption */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-white font-medium text-lg">{image.alt}</p>
                <p className="text-ncc-gold text-xs uppercase tracking-[0.2em] mt-1">{image.category}</p>
            </div>
        </div>
    );
}
