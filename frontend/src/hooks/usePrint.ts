"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export function usePrint(studentNames: string[]) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: () => {
      if (studentNames.length === 1) {
        return `خطة_${studentNames[0]}`;
      }
      return `خطط_قرآنية_${studentNames.length}_طلاب`;
    },
  });

  return { contentRef, handlePrint };
}
