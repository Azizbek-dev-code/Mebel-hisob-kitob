export interface TelegramPreviewContent {
  text: string;
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
}

export function TelegramMessagePreview({ content }: { content: TelegramPreviewContent }) {
  const text = content.text.trim() || '…';
  const buttonText = content.buttonText?.trim();
  const buttonUrl = content.buttonUrl?.trim();

  return (
    <div className="mx-auto w-full max-w-sm rounded-[1.5rem] border border-line bg-[#0e1621] p-3 shadow-card">
      <div className="rounded-2xl bg-[#182533] p-2 text-sm text-white">
        {content.imageUrl ? (
          <img
            src={content.imageUrl}
            alt=""
            className="mb-2 h-36 w-full rounded-xl object-cover"
          />
        ) : null}
        <p className="whitespace-pre-wrap break-words leading-5 text-white/95">{text}</p>
        {buttonText && buttonUrl ? (
          <a
            href={buttonUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block rounded-xl bg-[#2b5278] px-3 py-2 text-center text-sm font-medium text-white"
          >
            {buttonText}
          </a>
        ) : null}
      </div>
    </div>
  );
}
