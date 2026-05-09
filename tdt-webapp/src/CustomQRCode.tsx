import React, { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

interface Props {
  value: string;
  size: number;
  bgColor: string;
  fgColor: string;
}

function clearChildren(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

const CustomQRCode: React.FC<Props> = ({ value, size, bgColor, fgColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const qr = new QRCodeStyling({
      width: size,
      height: size,
      type: "canvas",
      data: value,
      qrOptions: { errorCorrectionLevel: "M" },
      dotsOptions: { color: fgColor, type: "square" },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: "extra-rounded", color: fgColor },
      cornersDotOptions: { type: "dot", color: fgColor },
      margin: 0,
    });
    qrRef.current = qr;
    if (containerRef.current) {
      clearChildren(containerRef.current);
      qr.append(containerRef.current);
    }
    return () => {
      if (containerRef.current) clearChildren(containerRef.current);
    };
  }, [size, bgColor, fgColor]);

  useEffect(() => {
    qrRef.current?.update({ data: value });
  }, [value]);

  return <div ref={containerRef} />;
};

export default CustomQRCode;
