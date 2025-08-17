import React, { useState, useEffect } from 'react';
import { TextInput, NumberInput, Select, Text } from '@mantine/core';

interface EditableCellProps {
  value: string | number;
  type: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  onSave: (value: string | number) => void;
  placeholder?: string;
  precision?: number;
  minValue?: number;
  maxValue?: number;
  readOnly?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type,
  options = [],
  onSave,
  placeholder,
  precision = 3,
  minValue,
  maxValue,
  readOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  if (readOnly || !isEditing) {
    return (
      <Text
        size="sm"
        style={{ 
          fontFamily: type === 'number' ? 'monospace' : undefined,
          cursor: readOnly ? 'default' : 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center'
        }}
        onClick={() => !readOnly && setIsEditing(true)}
        onDoubleClick={() => !readOnly && setIsEditing(true)}
      >
        {type === 'number' && typeof value === 'number' 
          ? value.toFixed(precision)
          : String(value)
        }
      </Text>
    );
  }

  if (type === 'select') {
    return (
      <Select
        value={String(editValue)}
        onChange={(val) => setEditValue(val || '')}
        data={options}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        size="sm"
        placeholder={placeholder}
        autoFocus
        style={{ minWidth: '120px' }}
      />
    );
  }

  if (type === 'number') {
    return (
      <NumberInput
        value={Number(editValue)}
        onChange={(val) => setEditValue(val || 0)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        size="sm"
        placeholder={placeholder}
        precision={precision}
        min={minValue}
        max={maxValue}
        autoFocus
        style={{ minWidth: '100px' }}
      />
    );
  }

  return (
    <TextInput
      value={String(editValue)}
      onChange={(event) => setEditValue(event.currentTarget.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      size="sm"
      placeholder={placeholder}
      autoFocus
      style={{ minWidth: '120px' }}
    />
  );
};