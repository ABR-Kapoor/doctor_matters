'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  type Transition,
} from 'framer-motion';
import { Sparkles, Pill, Activity, Video, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CardItem {
  id: number;
  title: string;
  description: string;
  icon: () => ReactNode;
  image?: string;
  imageLabel?: string;
}

export interface CardCarouselProps {
  items?: CardItem[];
}

const DEFAULT_CARDS: CardItem[] = [
  {
    id: 1,
    title: 'Dr. Manas AI Copilot',
    description: 'Draft intelligent EMR prescriptions, custom medicine dosages, and wellness instructions in one tap via advanced Google Gemini AI.',
    icon: () => (
      <Sparkles className="w-8 h-8 text-blue-600" />
    ),
    image: '/manas_ai_copilot.png',
    imageLabel: 'Dr. Manas AI',
  },
  {
    id: 2,
    title: 'Smart Clinical EMR',
    description: 'Prescribe dual Ayurvedic and Modern remedies seamlessly with active cross-interaction alerts and unified checkouts.',
    icon: () => (
      <Pill className="w-8 h-8 text-blue-600" />
    ),
    image: '/smart_clinical_emr.png',
    imageLabel: 'Unified EMR',
  },
  {
    id: 3,
    title: 'HD Teleconsultation',
    description: 'Host secure video consults in a unified dashboard window alongside real-time digital prescription writing pads.',
    icon: () => (
      <Video className="w-8 h-8 text-blue-600" />
    ),
    image: '/hd_teleconsultation.png',
    imageLabel: 'Secure Video',
  },
  {
    id: 4,
    title: 'Vitals & Compliance Hub',
    description: 'Stream real-time vitals and herb compliance reports directly from patient-side applications straight into your analytics panel.',
    icon: () => (
      <Activity className="w-8 h-8 text-blue-600" />
    ),
    image: '/vitals_compliance_hub.png',
    imageLabel: 'Vitals Loop',
  },
  {
    id: 5,
    title: 'OPD Queue & Finances',
    description: 'Optimize clinical OPD capacity, appointments, pending patient request lists, and live consulting revenue graphs.',
    icon: () => (
      <TrendingUp className="w-8 h-8 text-blue-600" />
    ),
    image: '/opd_queue_finances.png',
    imageLabel: 'Revenue Analytics',
  },
];

const ITEM_WIDTH = 320;
const GAP = 16;
const CONTAINER_WIDTH = ITEM_WIDTH + GAP;
const DRAG_BUFFER = 50;
const VELOCITY_THRESHOLD = 500;

const SPRING_OPTIONS: Transition = {
  type: 'spring',
  stiffness: 330,
  damping: 30,
};

interface CarouselCardProps {
  item: CardItem;
  index: number;
  x: ReturnType<typeof useMotionValue<number>>;
  itemCount: number;
}

const CarouselCard: React.FC<CarouselCardProps> = ({
  item,
  index,
  x,
  itemCount,
}) => {
  const nextIndex = Math.min(index + 1, itemCount - 1);
  const prevIndex = Math.max(index - 1, 0);

  const range = [
    (-100 * (index + 1) * CONTAINER_WIDTH) / 100,
    (-100 * index * CONTAINER_WIDTH) / 100,
    (-100 * (index - 1) * CONTAINER_WIDTH) / 100,
  ];
  const outputRange = [nextIndex ? 90 : 90, 0, prevIndex ? -90 : -90];

  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  return (
    <motion.div
      style={{
        width: ITEM_WIDTH,
        height: 480,
        rotateY,
        flexShrink: 0,
      }}
      transition={SPRING_OPTIONS}
      className="flex cursor-grab flex-col items-stretch rounded-[32px] border-[1.6px] border-blue-100 bg-white p-6 transition-colors active:cursor-grabbing shadow-sm"
    >
      {/* Icon and Header Info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border-[1.6px] border-blue-100 bg-blue-50/50 shadow-sm shrink-0">
          {item.icon()}
        </div>
        <div className="text-left">
          <h2 className="text-lg font-display font-black text-blue-950 leading-tight">
            {item.title}
          </h2>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
            AuraSutra Suite
          </p>
        </div>
      </div>

      <p className="text-xs font-bold text-blue-900/50 leading-relaxed mb-4 text-left">
        {item.description}
      </p>

      {/* Showcase Image with Careful Text Overlay */}
      {item.image && (
        <div className="relative overflow-hidden bg-blue-50/50 rounded-2xl border border-blue-100/60 p-1.5 flex-1 flex items-center justify-center group/img">
          {/* Careful Glassmorphic Text Overlay - extremely legible against any part of the image */}
          {item.imageLabel && (
            <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-blue-950/80 backdrop-blur-md text-white border border-white/20 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
              {item.imageLabel}
            </span>
          )}
          <img 
            src={item.image} 
            alt={item.title} 
            className="w-full h-full rounded-xl object-cover"
          />
        </div>
      )}
    </motion.div>
  );
};

export const CardSwipe: React.FC<CardCarouselProps> = ({
  items = DEFAULT_CARDS,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const x = useMotionValue(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const leftConstraint = -((ITEM_WIDTH + GAP) * (items.length - 1));

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div
        className="relative overflow-hidden"
        style={{ width: ITEM_WIDTH, height: 480 }}
      >
        <motion.div
          className="flex"
          drag="x"
          dragConstraints={{ left: leftConstraint, right: 0 }}
          style={{
            gap: GAP,
            perspective: 1000,
            perspectiveOrigin: currentIndex * ITEM_WIDTH + ITEM_WIDTH / 2,
            x,
          }}
          onDragEnd={handleDragEnd}
          animate={{ x: -(currentIndex * CONTAINER_WIDTH) }}
          transition={SPRING_OPTIONS}
        >
          {items.map((item: CardItem, index: number) => (
            <CarouselCard
              key={item.id}
              item={item}
              index={index}
              x={x}
              itemCount={items.length}
            />
          ))}
        </motion.div>
      </div>

      <div className="mt-6 flex gap-2">
        {items.map((_: CardItem, i: number) => (
          <div
            key={i}
            className={cn(
              'h-2 w-2 cursor-pointer rounded-full bg-blue-200 transition-colors duration-200',
              currentIndex === i && 'bg-blue-600',
            )}
            onClick={() => setCurrentIndex(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default CardSwipe;
