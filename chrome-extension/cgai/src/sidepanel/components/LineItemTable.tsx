import { useState, useCallback } from "react";
import type { CgDeclarationItem } from "@/types";
import TrafficLight from "./TrafficLight";

interface LineItemTableProps {
  items: CgDeclarationItem[];
  onEditItem: (
    localId: number,
    field: keyof CgDeclarationItem,
    value: string
  ) => void;
}

type EditableField = "hsCode" | "descriptionEn" | "quantity" | "weight" | "unitPrice" | "cifPrice";

const COLUMNS: { key: EditableField; label: string; width: string }[] = [
  { key: "hsCode", label: "HS Code", width: "w-24" },
  { key: "descriptionEn", label: "Description", width: "w-36" },
  { key: "quantity", label: "Qty", width: "w-16" },
  { key: "weight", label: "Weight", width: "w-16" },
  { key: "unitPrice", label: "Unit Price", width: "w-20" },
  { key: "cifPrice", label: "CIF", width: "w-20" },
];

interface EditingCell {
  localId: number;
  field: EditableField;
}

export default function LineItemTable({ items, onEditItem }: LineItemTableProps) {
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = useCallback(
    (localId: number, field: EditableField, currentValue: string) => {
      setEditing({ localId, field });
      setEditValue(currentValue || "");
    },
    []
  );

  const commitEdit = useCallback(() => {
    if (editing) {
      onEditItem(editing.localId, editing.field, editValue);
      setEditing(null);
    }
  }, [editing, editValue, onEditItem]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  if (items.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-4">
        ยังไม่มีรายการ — สแกน PDF เพื่อสกัดข้อมูล
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="py-2 px-1 w-6"></th>
            {COLUMNS.map((col) => (
              <th key={col.key} className={`py-2 px-1 text-left ${col.width}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.localId}
              className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                item.isConfirmed ? "opacity-60" : ""
              }`}
            >
              <td className="py-2 px-1">
                <TrafficLight item={item} />
              </td>
              {COLUMNS.map((col) => {
                const isEditing =
                  editing?.localId === item.localId &&
                  editing?.field === col.key;
                const cellValue = (item[col.key] as string) || "";

                return (
                  <td key={col.key} className={`py-2 px-1 ${col.width}`}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-full bg-gray-700 border border-amber-400 rounded px-1 py-0.5 text-white text-xs outline-none"
                      />
                    ) : (
                      <span
                        onClick={() =>
                          !item.isConfirmed &&
                          startEdit(item.localId!, col.key, cellValue)
                        }
                        className={`block truncate ${
                          item.isConfirmed
                            ? "cursor-default"
                            : "cursor-pointer hover:text-amber-300"
                        }`}
                        title={cellValue}
                      >
                        {cellValue || "-"}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
