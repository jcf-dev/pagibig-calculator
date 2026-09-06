import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default async function Icon() {
  const fontData = await fetch(
    new URL(
      "https://cdn.jsdelivr.net/gh/googlefonts/lexend@main/fonts/deca/ttf/LexendDeca-Medium.ttf",
      import.meta.url,
    ),
  ).then((response) => response.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          // impeccable-disable-next-line design-system-color -- Matches the main-site favicon.
          background: "linear-gradient(to bottom right, #f43f5e, #3b82f6)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "6px",
          fontWeight: 500,
          fontFamily: '"Lexend Deca"',
        }}
      >
        JF
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Lexend Deca",
          data: fontData,
          style: "normal",
          weight: 500,
        },
      ],
    },
  );
}
