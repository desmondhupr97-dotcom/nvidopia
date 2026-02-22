import { Spin } from 'antd';

export default function FullPageSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );
}
