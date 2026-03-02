import React, { useEffect, useState } from 'react';
import { Card, Spin } from '@douyinfe/semi-ui';
import SettingsStorage from '../../pages/Setting/Operation/SettingsStorage';
import { API, showError, toBoolean } from '../../helpers';

const StorageSetting = () => {
  let [inputs, setInputs] = useState({
    'storage_setting.r2_account_id': '',
    'storage_setting.r2_access_key_id': '',
    'storage_setting.r2_secret_access_key': '',
    'storage_setting.r2_bucket_name': '',
    'storage_setting.r2_custom_domain': '',
    'storage_setting.r2_auto_delete_days': 0,
    'storage_setting.ali_r2_enable': false,
    'storage_setting.kling_r2_enable': false,
    'storage_setting.jimeng_r2_enable': false,
    'storage_setting.vidu_r2_enable': false,
    'storage_setting.doubao_r2_enable': false,
    'storage_setting.hailuo_r2_enable': false,
    'storage_setting.grok_r2_enable': false,
  });

  let [loading, setLoading] = useState(false);

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
        if (typeof inputs[item.key] === 'boolean') {
          newInputs[item.key] = toBoolean(item.value);
        } else {
          newInputs[item.key] = item.value;
        }
      });
      setInputs(newInputs);
    } else {
      showError(message);
    }
  };

  async function onRefresh() {
    try {
      setLoading(true);
      await getOptions();
    } catch (error) {
      showError('刷新失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    onRefresh();
  }, []);

  return (
    <Spin spinning={loading} size='large'>
      <Card style={{ marginTop: '10px' }}>
        <SettingsStorage options={inputs} refresh={onRefresh} />
      </Card>
    </Spin>
  );
};

export default StorageSetting;
