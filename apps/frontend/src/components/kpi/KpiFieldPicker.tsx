import { useMemo } from 'react';
import { TreeSelect } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getSchemaFields, type SchemaFieldMeta, type SchemaEntityFields } from '../../api/client';

interface Props {
  entity: string;
  value?: string;
  onChange: (field: string) => void;
}

interface TreeNode {
  title: string;
  value: string;
  children?: TreeNode[];
  selectable?: boolean;
}

function toTreeData(fields: SchemaFieldMeta[], prefix = ''): TreeNode[] {
  return fields.map((f) => {
    const path = prefix ? `${prefix}.${f.name}` : f.name;
    const hasChildren = f.children && f.children.length > 0;
    return {
      title: `${f.name} (${f.type})`,
      value: path,
      selectable: !hasChildren,
      children: hasChildren ? toTreeData(f.children!, path) : undefined,
    };
  });
}

export default function KpiFieldPicker({ entity, value, onChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['schema-fields', entity],
    queryFn: () => getSchemaFields(entity),
    enabled: !!entity,
  });

  const treeData = useMemo(() => {
    if (!data) return [];
    const entityData = 'fields' in (data as SchemaEntityFields)
      ? (data as SchemaEntityFields)
      : undefined;
    return entityData ? toTreeData(entityData.fields) : [];
  }, [data]);

  return (
    <TreeSelect
      value={value || undefined}
      onChange={onChange}
      treeData={treeData}
      loading={isLoading}
      placeholder={entity ? 'Select field...' : 'Choose entity first'}
      disabled={!entity}
      showSearch
      treeDefaultExpandAll
      style={{ width: '100%' }}
      dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
      popupClassName="ios-card-elevated"
    />
  );
}
