import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react";
import type { CgDeclarationItem, AuditRisk } from "@/types";
import TrafficLight from "./TrafficLight";

interface LineItemTableProps {
  items: CgDeclarationItem[];
  riskMap?: Map<number, AuditRisk>;
  onEditItem: (
    localId: number,
    field: keyof CgDeclarationItem,
    value: string
  ) => void;
  onConfirmItem: (localId: number) => void;
}

type EditableField = "hsCode" | "descriptionEn" | "quantity" | "weight" | "unitPrice" | "cifPrice" | "insuranceAmount" | "freightAmount";

/** Validate Thai customs HS code format: DDDD.DD or DDDD.DD.DD (8 or 10 digits with dots) */
function isValidHsCode(code: string): boolean {
  return /^\d{4}\.\d{2}(\.\d{2})?$/.test(code);
}

/** Validate weight has a standard customs unit (KG, G, T, LTR, PCS etc.) */
const STANDARD_WEIGHT_UNITS = /\b(KG|KGS|KGM|G|GRM|T|TNE|MT|LTR|L|M|MTR|PCS|PC|UNIT|CTN|PKG|SET|DOZ|PR|PAIR)\s*$/i;
function isValidWeight(weight: string): boolean {
  if (!weight) return true;
  return STANDARD_WEIGHT_UNITS.test(weight.trim());
}

interface EditingCell {
  localId: number;
  field: EditableField;
}

export default function LineItemTable({ items, riskMap, onEditItem, onConfirmItem }: LineItemTableProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");

  const COLUMNS: { key: EditableField; label: string; width: string }[] = [
    { key: "hsCode", label: t("table.hsCode"), width: "w-24" },
    { key: "descriptionEn", label: t("table.description"), width: "w-36" },
    { key: "quantity", label: t("table.qty"), width: "w-16" },
    { key: "weight", label: t("table.weight"), width: "w-16" },
    { key: "unitPrice", label: t("table.unitPrice"), width: "w-20" },
    { key: "insuranceAmount", label: t("table.insurance"), width: "w-16" },
    { key: "freightAmount", label: t("table.freight"), width: "w-16" },
    { key: "cifPrice", label: t("table.cif"), width: "w-20" },
  ];

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
        {t("scan.noItems")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-200">
            <th className="py-2 px-1 w-6"></th>
            {COLUMNS.map((col) => (
              <th key={col.key} className={`py-2 px-1 text-left ${col.width}`}>
                {col.label}
              </th>
            ))}
            <th className="py-2 px-1 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.localId}
              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                item.isConfirmed ? "bg-green-50/50" : ""
              }`}
            >
              <td className="py-2 px-1">
                <TrafficLight item={item} risk={riskMap?.get(item.localId!)} />
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
                        className="w-full bg-white border border-brand rounded px-1 py-0.5 text-gray-900 text-xs outline-none"
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
                            : "cursor-pointer hover:text-brand"
                        } ${
                          col.key === "hsCode" && cellValue && !isValidHsCode(cellValue)
                            ? "text-red-600"
                            : col.key === "weight" && cellValue && !isValidWeight(cellValue)
                            ? "text-orange-600"
                            : ""
                        }`}
                        title={
                          col.key === "hsCode" && cellValue && !isValidHsCode(cellValue)
                            ? `${cellValue} — รูปแบบไม่ถูกต้อง (ต้องเป็น DDDD.DD เช่น 0306.17)`
                            : col.key === "weight" && cellValue && !isValidWeight(cellValue)
                            ? `${cellValue} — หน่วยน้ำหนักไม่ตรงมาตรฐาน กรุณาแก้เป็น KG`
                            : cellValue
                        }
                      >
                        {cellValue || "-"}
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="py-2 px-1 w-12 text-center">
                {item.isConfirmed ? (
                  <CheckCircle className="w-4 h-4 text-green-600 inline-block" />
                ) : (
                  <button
                    onClick={() => onConfirmItem(item.localId!)}
                    className="px-1.5 py-0.5 text-[10px] bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    title={t("table.confirm")}
                  >
                    OK
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
