import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableStageProps {
  id: string;
  children: ReactNode;
  isOver?: boolean;
}

export function DroppableStage({ id, children, isOver }: DroppableStageProps) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({ id });

  // Use either the passed isOver prop or the droppable's isOver state
  const showHover = isOver || isOverDroppable;

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 ease-in-out ${
        showHover 
          ? 'bg-primary/10 border-primary/50 border-2 border-dashed rounded-lg scale-[1.01] shadow-lg' 
          : 'border-2 border-transparent'
      }`}
    >
      {children}
    </div>
  );
}