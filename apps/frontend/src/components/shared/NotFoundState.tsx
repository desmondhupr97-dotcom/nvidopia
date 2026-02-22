import { Empty } from 'antd';

interface Props {
  entity: string;
}

export default function NotFoundState({ entity }: Props) {
  return <Empty description={`${entity} not found`} style={{ padding: 80 }} />;
}
