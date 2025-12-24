export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

interface JsonVisualizerProps {
  data: JsonValue;
  isLast?: boolean;
  isChildOfArray?: boolean;
  keyName?: string | number;
}

export const JsonVisualizer: React.FC<JsonVisualizerProps> = ({
  data,
  isLast = true,
  isChildOfArray = false,
  keyName,
}) => {
  const renderValue = (value: JsonValue, key?: string | number): JSX.Element => {
    const isLastItem = isLast && !isChildOfArray;
    const lineClass = isLastItem ? "tree-last" : "tree";

    const renderKey = (k: string | number | undefined) => {
      if (k === undefined) return null;
      return <span className="text-purple-600 mr-1">{k}: </span>;
    };

    if (value === null)
      return (
        <div className={lineClass}>
          {renderKey(key)}
          <span className="text-gray-500">null</span>
        </div>
      );
    if (typeof value === "boolean")
      return (
        <div className={lineClass}>
          {renderKey(key)}
          <span className="text-blue-600">{value.toString()}</span>
        </div>
      );
    if (typeof value === "number")
      return (
        <div className={lineClass}>
          {renderKey(key)}
          <span className="text-green-600">{value}</span>
        </div>
      );
    if (typeof value === "string")
      return (
        <div className={lineClass}>
          {renderKey(key)}
          <span className="text-red-600">"{value}"</span>
        </div>
      );

    if (Array.isArray(value)) {
      return (
        <div className={lineClass}>
          {renderKey(key)}
          <span className="font-bold">Array</span>
          <ul className="ml-4 border-white">
            {value.map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: no way to do it anyway
              <li key={index} className="list-none">
                <JsonVisualizer
                  data={item}
                  isLast={index === value.length - 1}
                  isChildOfArray={true}
                  keyName={index}
                />
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (typeof value === "object") {
      return (
        <div className={lineClass}>
          {renderKey(key)}
          <span className="font-bold">Object</span>
          <ul className="ml-4 border-white">
            {Object.entries(value).map(([objKey, val], index, arr) => (
              <li key={objKey} className="list-none">
                <JsonVisualizer data={val} isLast={index === arr.length - 1} keyName={objKey} />
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return null;
  };

  return <div className="font-mono text-sm">{renderValue(data, keyName)}</div>;
};
