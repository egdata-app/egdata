import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-portal";
import { useVideo } from "@/hooks/use-video";

export function BlurredBackground({ src }: { src: string }) {
  const { isHovered, canvasRef } = useVideo();
  const localCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const drawFrame = () => {
      const canvas = localCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas && canvasRef?.current) {
        ctx.drawImage(canvasRef.current, 0, 0, canvas.width, canvas.height);
        ctx.filter = "blur(1px)";
        ctx.drawImage(canvas, 0, 0);
      }
      animationFrameId = requestAnimationFrame(drawFrame);
    };

    if (isHovered && canvasRef?.current) {
      drawFrame();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isHovered, canvasRef]);

  return (
    <Portal>
      <div
        className={cn(
          "fade-in w-full h-[700px] absolute inset-0 -z-10 pointer-events-none bg-no-repeat bg-fit bg-center",
          "blur-3xl bg-opacity-15 bg-black/40 filter brightness-[0.15]",
          "transition-all duration-1000 ease-in-out",
          isHovered ? "opacity-0" : "opacity-100",
        )}
        style={{
          backgroundImage: `url(${src})`,
        }}
      />
      <canvas
        ref={localCanvasRef}
        className={cn(
          "absolute inset-0 -z-10 pointer-events-none w-full h-[700px] filter brightness-[0.30] blur-3xl",
          "transition-all duration-1000 ease-in-out",
          isHovered ? "opacity-50" : "opacity-0",
        )}
        width={720}
        height={480}
      />
    </Portal>
  );
}
