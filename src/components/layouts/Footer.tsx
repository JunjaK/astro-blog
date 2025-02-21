import { Button } from '@/components/ui/button.tsx';
import { Icon } from '@iconify/react';
// @flow
import * as React from 'react';

type Props = {

};
export default function Footer(props: Props) {
  return (
    <footer className="layout-background">
      <div className="footer-wrapper">
        <div className="flex items-center">
          <div className="text-sm text-gray-500">
            © 2025 • Junjak •
          </div>
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com/JunjaK/astro-blog" aria-label="github-repo">
              <Icon icon="mingcute:git-branch-line" className="icon text-lg ml-1 text-gray-500" />
            </a>
          </Button>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild name="github" aria-label="github">
            <a href="https://github.com/JunjaK">
              <Icon icon="mingcute:github-fill" className="icon text-lg ml-1 text-gray-500" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href="https://www.linkedin.com/in/junjak-063081213" aria-label="linkedin">
              <Icon icon="mingcute:linkedin-fill" className="icon text-lg ml-1 text-gray-500" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href="mailto:haring157@gmail.com" aria-label="mailto">
              <Icon icon="mingcute:mail-fill" className="icon text-lg ml-1 text-gray-500" />
            </a>
          </Button>
        </div>
      </div>

    </footer>
  );
}
