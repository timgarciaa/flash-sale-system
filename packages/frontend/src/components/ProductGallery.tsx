import { useCallback, useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ProductImageGalleryProps {
  images: readonly string[];
  mainImageAlt: string;
}

export function ProductGallery({
  images,
  mainImageAlt,
}: ProductImageGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    queueMicrotask(onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api],
  );

  return (
    <div className="flex-[0_0_45%] min-w-75 p-6 border-r border-[#f0f0f0] box-border">
      <Carousel setApi={setApi} className="w-full">
        <div className="relative mb-3">
          <CarouselContent className="ml-0">
            {images.map((src, i) => (
              <CarouselItem key={i} className="basis-full pl-0">
                <div className="border border-[#e0e0e0] rounded overflow-hidden aspect-square flex items-center justify-center bg-[#fafafa]">
                  <img
                    src={src}
                    alt={mainImageAlt}
                    className="w-full h-full object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 z-10" />
          <CarouselNext className="right-2 z-10" />
        </div>

        <div className="flex gap-2">
          {images.map((src, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => scrollTo(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  scrollTo(i);
                }
              }}
              className={
                i === current
                  ? "flex-1 border-2 border-orange rounded overflow-hidden aspect-square cursor-pointer bg-[#fafafa] flex items-center justify-center"
                  : "flex-1 border border-[#e0e0e0] rounded overflow-hidden aspect-square cursor-pointer bg-[#fafafa] flex items-center justify-center"
              }
            >
              <img
                src={src}
                alt={`Thumbnail ${i + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </div>
      </Carousel>
    </div>
  );
}
