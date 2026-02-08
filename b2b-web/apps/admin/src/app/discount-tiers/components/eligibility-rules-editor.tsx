"use client";

import { Button, Input, Label } from "@b2b/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { Plus, Trash2 } from "lucide-react";
import * as React from "react";

import {
  type EligibilityRule,
  RULE_TYPES,
  RULE_OPERATORS,
} from "../hooks/use-discount-tiers";

interface EligibilityRulesEditorProps {
  rules: EligibilityRule[];
  onChange: (rules: EligibilityRule[]) => void;
  disabled?: boolean;
}

function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function EligibilityRulesEditor({
  rules,
  onChange,
  disabled,
}: EligibilityRulesEditorProps) {
  const addRule = () => {
    const newRule: EligibilityRule = {
      id: generateId(),
      type: "min_order_value",
      operator: "gte",
      value: "",
      description: "",
    };
    onChange([...rules, newRule]);
  };

  const updateRule = (
    id: string,
    field: keyof EligibilityRule,
    value: string | number | string[]
  ) => {
    onChange(
      rules.map((rule) =>
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    );
  };

  const removeRule = (id: string) => {
    onChange(rules.filter((rule) => rule.id !== id));
  };

  const getOperatorsForType = (type: EligibilityRule["type"]) => {
    switch (type) {
      case "min_order_value":
      case "min_orders":
        return RULE_OPERATORS.filter((op) =>
          ["eq", "gt", "gte", "lt", "lte"].includes(op.value)
        );
      case "organization":
      case "user_role":
        return RULE_OPERATORS.filter((op) =>
          ["eq", "in"].includes(op.value)
        );
      case "custom":
        return RULE_OPERATORS;
      default:
        return RULE_OPERATORS;
    }
  };

  const getValuePlaceholder = (type: EligibilityRule["type"]) => {
    switch (type) {
      case "min_order_value":
        return "e.g., 1000";
      case "min_orders":
        return "e.g., 5";
      case "organization":
        return "Organization ID or name";
      case "user_role":
        return "e.g., MANAGER";
      case "custom":
        return "Custom value";
      default:
        return "Value";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Eligibility Rules</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRule}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No eligibility rules defined. Users will need to be manually assigned
            to this tier.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={addRule}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add First Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className="rounded-lg border bg-muted/30 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rule {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(rule.id)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={rule.type}
                    onValueChange={(value) =>
                      updateRule(rule.id, "type", value as EligibilityRule["type"])
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={rule.operator}
                    onValueChange={(value) =>
                      updateRule(
                        rule.id,
                        "operator",
                        value as EligibilityRule["operator"]
                      )
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorsForType(rule.type).map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input
                    type={
                      ["min_order_value", "min_orders"].includes(rule.type)
                        ? "number"
                        : "text"
                    }
                    value={rule.value as string}
                    onChange={(e) =>
                      updateRule(
                        rule.id,
                        "value",
                        ["min_order_value", "min_orders"].includes(rule.type)
                          ? Number(e.target.value)
                          : e.target.value
                      )
                    }
                    placeholder={getValuePlaceholder(rule.type)}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description (optional)</Label>
                <Input
                  value={rule.description || ""}
                  onChange={(e) =>
                    updateRule(rule.id, "description", e.target.value)
                  }
                  placeholder="Describe this rule..."
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
