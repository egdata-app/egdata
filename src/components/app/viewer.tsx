import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import { cn } from "@/lib/utils";

const extensions = [StarterKit, UnderlineExtension];

export const Viewer = ({ content, className }: { content: JSONContent; className?: string }) => {
  const editor = useEditor({
    extensions,
    content,
    editorProps: {
      attributes: {
        class: cn(
          className,
          "prose-inverted prose-sm focus:outline-none",
          "prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4 prose-ul:ml-4 prose-ol:ml-4",
          "prose-blockquote:border-l prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:text-primary",
          "prose-blockquote:font-semibold prose-blockquote:ml-4",
        ),
      },
    },
    editable: false,
  });

  return <EditorContent editor={editor} />;
};
