import {
  useEditor,
  EditorContent,
  BubbleMenu,
  FloatingMenu,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import { Toggle } from "../ui/toggle";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  TextQuote,
  Underline as UnderlineIcon,
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";

const extensions = [StarterKit, UnderlineExtension];

const tools = [
  { Icon: Bold, action: "bold", tooltip: "Bold" },
  { Icon: Italic, action: "italic", tooltip: "Italic" },
  { Icon: UnderlineIcon, action: "underline", tooltip: "Underline" },
  { Icon: Strikethrough, action: "strike", tooltip: "Strikethrough" },
  { Icon: TextQuote, action: "blockquote", tooltip: "Quote" },
  { Icon: List, action: "bulletList", tooltip: "Bullet List" },
  { Icon: ListOrdered, action: "orderedList", tooltip: "Numbered List" },
];

export const Editor = ({
  content,
  setContent,
}: {
  content: JSONContent;
  setContent: React.Dispatch<React.SetStateAction<JSONContent>>;
}) => {
  const editor = useEditor({
    extensions,
    content,
    onUpdate: (value) => setContent(value.editor.getJSON()),
    editorProps: {
      attributes: {
        class: cn(
          "prose-inverted prose-sm px-3 py-2 min-h-72 focus:outline-none border border-border rounded-lg",
          "prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4 prose-ul:ml-4 prose-ol:ml-4",
          "prose-blockquote:border-l prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:text-primary prose-blockquote:font-semibold prose-blockquote:ml-4",
        ),
      },
    },
  });

  return (
    <TooltipProvider>
      <ScrollArea className="h-72">
        <EditorContent editor={editor} />
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="inline-flex items-center rounded-md border bg-background p-1 shadow-sm bg-opacity-20 backdrop-blur-sm gap-1"
          >
            {tools.map((tool, index) => (
              <React.Fragment key={tool.action}>
                {index === 4 && <Separator orientation="vertical" className="mx-0.5 h-4" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={editor.isActive(tool.action)}
                      onPressedChange={() =>
                        editor
                          .chain()
                          .focus()
                          [`toggle${tool.action.charAt(0).toUpperCase() + tool.action.slice(1)}`]()
                          .run()
                      }
                      aria-label={tool.tooltip}
                      className="h-8 w-8 p-0 aria-[pressed=true]:bg-accent aria-[pressed=true]:text-accent-foreground"
                    >
                      {React.createElement(tool.Icon, { className: "h-4 w-4" })}
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {tool.tooltip}
                  </TooltipContent>
                </Tooltip>
              </React.Fragment>
            ))}
          </BubbleMenu>
        )}
        {editor && (
          <FloatingMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="inline-flex items-center rounded-md border bg-background p-1 shadow-sm gap-1 opacity-40 hover:opacity-100 transition-opacity ease-in-out duration-300 bg-opacity-20 backdrop-blur-sm"
          >
            {tools.map((tool, index) => (
              <React.Fragment key={tool.action}>
                {index === 4 && <Separator orientation="vertical" className="mx-0.5 h-4" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={editor.isActive(tool.action)}
                      onPressedChange={() =>
                        editor
                          .chain()
                          .focus()
                          [`toggle${tool.action.charAt(0).toUpperCase() + tool.action.slice(1)}`]()
                          .run()
                      }
                      aria-label={tool.tooltip}
                      className="h-6 w-6 p-0 aria-[pressed=true]:bg-accent aria-[pressed=true]:text-accent-foreground"
                    >
                      {React.createElement(tool.Icon, { className: "h-3 w-3" })}
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {tool.tooltip}
                  </TooltipContent>
                </Tooltip>
              </React.Fragment>
            ))}
          </FloatingMenu>
        )}
      </ScrollArea>
    </TooltipProvider>
  );
};
