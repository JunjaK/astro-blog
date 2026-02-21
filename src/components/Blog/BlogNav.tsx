import type { CollectionEntry } from 'astro:content';
import { Icon } from '@/components/ui/icon';
import dayjs from 'dayjs';
import { Button } from '../ui/button';

type Props = {
  nav?: {
    prev: CollectionEntry<'blog'> | null;
    next: CollectionEntry<'blog'> | null;
  };
};

export default function BlogNav({ nav }: Props) {
  function getCreatedDt(date: Date) {
    return dayjs(date).format('YYYY-MM-DD');
  }

  return (
    <div className="flex justify-between gap-4">
      <div className="btn-wrapper">
        {nav?.prev && (
          <Button variant="outline" className="prev nav-button">
            <a href={`/blog/${nav.prev.id}`}>
              <div className="flex justify-start">
                <Icon icon="mingcute:left-line" className="nav-icon" />
                <h3>이전 글</h3>
              </div>
              <div className="content">
                <div className="title">
                  {nav.prev.data.title}
                </div>
                <div className="nav-created-time">
                  {getCreatedDt(nav.prev.data.created)}
                </div>
              </div>

            </a>
          </Button>
        )}
      </div>

      <div className="btn-wrapper">
        {nav?.next && (
          <Button variant="outline" className="next nav-button">
            <a href={`/blog/${nav.next.id}`}>
              <div className="flex justify-end">
                <h3>다음 글</h3>
                <Icon icon="mingcute:right-line" className="nav-icon" />
              </div>
              <div className="content">
                <p className="title">
                  {nav.next.data.title}
                </p>
                <p className="nav-created-time">
                  {getCreatedDt(nav.next.data.created)}
                </p>
              </div>
            </a>
          </Button>
        )}
      </div>
    </div>

  );
}
