import { Card, CardContent } from '@/components/ui/card';

import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

import * as React from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';

type Props = {
  images: string[];
};

export function ProjectCarousel({ images }: Props) {
  return (
    <div className="flex justify-center items-center project-carousel">
      <PhotoProvider>
        <Carousel
          opts={{
            align: 'start',
          }}
          className="w-[80%]"
        >
          <CarouselContent>
            {images.map((item, index) => (
              <CarouselItem key={item} className="md:basis-1/2 lg:basis-1/3">
                <PhotoView src={item}>

                  <div className="cursor-pointer">
                    <Card>
                      <CardContent className="flex items-center justify-center p-2">
                        <img src={item} alt={`project-${index}`} className="m-0" />
                      </CardContent>
                    </Card>
                  </div>
                </PhotoView>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots />
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </PhotoProvider>

    </div>

  );
}
