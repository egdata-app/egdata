import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import type { SingleBuild } from "@/types/builds";
import type { Asset } from "@/types/asset";
import { Link } from "@tanstack/react-router";
import { type JsonValue, JsonVisualizer } from "../json-tree";
import { calculateSize } from "@/lib/calculate-size";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { Separator } from "@/components/ui/separator";
import { DateTime } from "luxon";

interface Metadata {
  contextType: "offer" | "item" | "asset" | "build" | "sandbox";
  contextId: string;
  changes: Change[];
}

interface Change {
  changeType: "insert" | "update" | "delete";
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface ChangeTrackerProps {
  _id: string;
  timestamp: string;
  metadata: Metadata;
  document: unknown;
}

interface OfferChange extends ChangeTrackerProps {
  metadata: Metadata & { contextType: "offer" };
  document: SingleOffer;
}

interface ItemChange extends ChangeTrackerProps {
  metadata: Metadata & { contextType: "item" };
  document: SingleItem;
}

interface BuildChange extends ChangeTrackerProps {
  metadata: Metadata & { contextType: "build" };
  document: SingleBuild;
}

interface AssetChange extends ChangeTrackerProps {
  metadata: Metadata & { contextType: "asset" };
  document: Asset;
}

const epicVideoProtocol = "com.epicgames.video://";

/**
 * Some images changes are detected as insert and delete, instead of update
 * Find
 */
function correctChanges(changes: Change[]): Change[] {
  const inserts: Change[] = [];
  const deletes: Change[] = [];
  const others: Change[] = [];

  // Separate changes into inserts, deletes, and others
  for (const change of changes) {
    if (change.field === "keyImages") {
      if (change.changeType === "insert") {
        inserts.push(change);
      } else if (change.changeType === "delete") {
        deletes.push(change);
      } else {
        others.push(change);
      }
    } else {
      others.push(change);
    }
  }

  const updatedChanges: Change[] = [];
  const usedDeletes = new Set<Change>();

  // Match inserts with deletes to form updates
  for (const insert of inserts) {
    const newValue = insert.newValue as { type: string; md5: string };

    const matchingDelete = deletes.find(
      (del) =>
        !usedDeletes.has(del) &&
        (del.oldValue as { type: string; md5: string }).type === newValue.type,
    );

    if (matchingDelete) {
      // Form an update change
      updatedChanges.push({
        changeType: "update",
        field: "keyImages",
        oldValue: matchingDelete.oldValue,
        newValue: insert.newValue,
      });
      usedDeletes.add(matchingDelete); // Mark this delete as used
    } else {
      // No matching delete, keep as insert
      updatedChanges.push(insert);
    }
  }

  // Add remaining unmatched deletes
  const unmatchedDeletes = deletes.filter((del) => !usedDeletes.has(del));
  updatedChanges.push(...unmatchedDeletes);

  // Add all other changes
  updatedChanges.push(...others);

  // sorting (:
  return updatedChanges.sort((a, b) => {
    if (a.field === b.field) {
      if (a.changeType === b.changeType) {
        return String(a.oldValue).localeCompare(String(b));
      }

      return a.changeType.localeCompare(b.changeType);
    }

    return a.field.localeCompare(b.field);
  });
}

export function ChangeTracker({
  _id,
  timestamp,
  metadata,
  document,
}: OfferChange | ItemChange | BuildChange | AssetChange) {
  const { timezone } = useLocale();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const getActionStyle = (action: "update" | "delete" | "insert") => {
    switch (action) {
      case "update":
        return "bg-blue-500/20 text-blue-400";
      case "delete":
        return "bg-red-500/20 text-red-400";
      case "insert":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getContextTypeStyle = (contextType: "offer" | "item" | "asset" | "build" | "sandbox") => {
    switch (contextType) {
      case "offer":
        return "bg-blue-500/20 text-blue-400";
      case "item":
        return "bg-green-500/20 text-green-400";
      case "asset":
        return "bg-red-500/20 text-red-400";
      case "build":
        return "bg-yellow-500/20 text-yellow-400";
      case "sandbox":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium",
              getContextTypeStyle(metadata.contextType),
            )}
          >
            {metadata.contextType}
          </div>
          <Link
            className="text-lg font-medium truncate max-w-[300px] underline decoration-dotted decoration-muted-foreground/40 underline-offset-4"
            to={`/${metadata.contextType}s/${metadata.contextId}`}
          >
            {document && "title" in document ? document?.title : metadata.contextId}
          </Link>
          <Link
            to={`/changelog/${_id}`}
            className="text-sm text-blue-400 hover:underline font-mono"
          >
            {_id.slice(0, 10)}
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
          <span>{metadata.changes.length} changes</span>
          <Separator orientation="vertical" className="h-4 w-px bg-muted-foreground" />
          <span>
            {new Date(timestamp).toLocaleDateString("en-UK", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              timeZone: timezone,
              timeZoneName: "short",
            })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead className="w-[400px]">Type</TableHead>
              <TableHead className="w-1/3">Old value</TableHead>
              <TableHead className="w-1/3">New value</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {correctChanges(metadata.changes).map((change, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: index is the only key
              <React.Fragment key={index}>
                <TableRow className="group">
                  <TableCell>
                    <span
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium",
                        getActionStyle(change.changeType),
                      )}
                    >
                      {change.changeType}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm w-[400px]">{change.field}</TableCell>
                  <TableCell className="text-red-400 line-through w-1/3">
                    {ValueToString(change.oldValue, "", change.field, true)}
                  </TableCell>
                  <TableCell className="text-green-400 w-1/3">
                    {ValueToString(change.newValue, "", change.field, true)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRow(index.toString())}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      {expandedRows.has(index.toString()) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedRows.has(index.toString()) && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/50 px-8">
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <div className="text-sm font-medium text-red-400">Previous value:</div>
                          <div className="text-sm text-muted-foreground">
                            {ValueToString(change.oldValue, "", change.field)}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <div className="text-sm font-medium text-green-400">New value:</div>
                          <div className="text-sm text-muted-foreground">
                            {ValueToString(change.newValue, "", change.field)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ValueToString(value: unknown, query: string, field?: string, short?: boolean) {
  const { timezone } = useLocale();

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: index is the only key
        <mark key={i}>{part}</mark>
      ) : (
        part
      ),
    );
  };

  if (value === null) return "N/A";

  if (field === "asset" && short) {
    return <span className="font-mono">{value?.artifactId}</span>;
  }

  if (field === "keyImages" && value !== null) {
    const typedValue = value as { url: string; md5: string; type: string };

    if (typedValue.url.startsWith(epicVideoProtocol) && URL.canParse(typedValue.url)) {
      const parsedUrl = new URL(typedValue.url);
      const coverUrl = parsedUrl.searchParams.get("cover");
      const videoId = parsedUrl.host;

      return (
        <div className="flex items-start justify-start gap-2">
          <div>
            <p>Video {videoId}</p>

            {coverUrl && (
              <img
                src={coverUrl}
                alt={videoId}
                className="w-1/2 max-w-64 h-auto object-cover rounded-lg"
              />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-start justify-start gap-2">
        <img
          src={typedValue.url}
          alt={typedValue.md5}
          className="w-1/2 max-w-64 h-auto object-cover rounded-lg"
        />
      </div>
    );
  }

  if (field?.includes("Date") && typeof value === "string") {
    return DateTime.fromISO(value, { zone: timezone }).setLocale("en-GB").toLocaleString({
      weekday: undefined,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
    });
  }

  if (field === "tags" && value !== null) {
    const typedValue = value as { id: string; name: string };
    return <span className="font-medium">{typedValue.name}</span>;
  }

  if (field?.includes("Bytes")) {
    return <span className="font-mono">{calculateSize(value as number)}</span>;
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "string") {
    if (short) return value.length > 50 ? `${value.slice(0, 50)}...` : value;
    return <>{highlightText(value, query)}</>;
  }

  if (typeof value === "object") {
    return <JsonVisualizer data={value as JsonValue} />;
  }

  return value?.toString() || "N/A";
}
