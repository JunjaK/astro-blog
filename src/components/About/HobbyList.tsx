import { motion } from 'framer-motion';
// @flow
import * as React from 'react';

type HobbyCategory = {
  title: string;
  details: { label: string; items: string[] }[];
};

export function HobbyList() {
  const hobbies: HobbyCategory[] = [
    {
      title: '게임',
      details: [
        {
          label: '좋아하는 장르',
          items: ['리듬게임', '전략시뮬레이션', 'RPG'],
        },
        {
          label: '플레이 중',
          items: ['명일방주', 'DJ MAX', '햄탈워3', '메타포: 리판타지오', '롤'],
        },
      ],
    },
    {
      title: '애니메이션',
      details: [
        {
          label: '최애',
          items: ['Phyco-pass', '장송의 프리렌', '봇치 더 락', '걸즈 밴드 크라이', '주술회전'],
        },
        {
          label: '현재 시청 중',
          items: ['나혼렙', '지', '푸른 상자', '약사의 혼잣말', '꽃은 피어난다 수라와 같이'],
        },
      ],
    },
    {
      title: '음악',
      details: [
        {
          label: '좋아하는 장르',
          items: ['J-Pop', 'New Age', 'Rock'],
        },
        {
          label: '최애',
          items: ['Yoasobi', '요네즈켄시', 'Vaundy', 'Kinggnu', 'Ado'],
        },
      ],
    },
    {
      title: '일본 여행',
      details: [
        {
          label: '목표',
          items: ['일본 전국을 다 돌아보는 것'],
        },
        {
          label: '기록',
          items: ['여행기는 블로그에 작성 예정입니다.'],
        },
      ],
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="space-y-6">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-bold mb-6"
      >
        Hobbies
      </motion.h2>
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 gap-8"
      >
        {/* {hobbies.map((hobby) => (
          <motion.div
            key={hobby.title}
            variants={item}
            className="space-y-3 p-4 bg-white dark:bg-neutral-800 shadow-md rounded-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {hobby.title}
            </h3>
            {hobby.details.map((detail) => (
              <div key={detail.label} className="space-y-1">
                <div className="text-[1rem] font-medium text-neutral-700 dark:text-neutral-300">
                  {detail.label}
                </div>
                <ul className="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
                  {detail.items.map((item) => (
                    <li key={item} className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        ))} */}
      </motion.div>
    </div>
  );
}
