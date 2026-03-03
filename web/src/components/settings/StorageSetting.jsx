import React, { useEffect, useState } from 'react';
import { Card, Spin } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import SettingsStorage from '../../pages/Setting/Operation/SettingsStorage';
import { API, showError, toBoolean } from '../../helpers';

const STORAGE_DEFAULTS = {
  'storage_setting.r2_account_id': '',
  'storage_setting.r2_access_key_id': '',
  'storage_setting.r2_secret_access_key': '',
  'storage_setting.r2_bucket_name': '',
  'storage_setting.r2_custom_domain': '',
  'storage_setting.r2_auto_delete_days': 0,
  'storage_setting.image_r2_enable': false,
  'storage_setting.image_r2_prefix': 'images',
  'storage_setting.image_r2_auto_delete_days': 0,
  'storage_setting.video_r2_enable': false,
  'storage_setting.video_r2_prefix': 'video',
  'storage_setting.playground_forward_enable': true,
};

const BOOLEAN_KEYS = new Set([
  'storage_setting.image_r2_enable',
  'storage_setting.video_r2_enable',
  'storage_setting.playground_forward_enable',
]);

const StorageSetting = () => {
  const { t } = useTranslation();
  let [inputs, setInputs] = useState(STORAGE_DEFAULTS);

  let [loading, setLoading] = useState(false);

  const getOptions = async () => {
    const res = await API.get('/api/storage/options');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = { ...STORAGE_DEFAULTS };
      data.forEach((item) => {
        if (!(item.key in STORAGE_DEFAULTS)) {
          return;
        }
        if (BOOLEAN_KEYS.has(item.key)) {
          newInputs[item.key] = toBoolean(item.value);
        } else if (
          item.key === 'storage_setting.r2_auto_delete_days' ||
          item.key === 'storage_setting.image_r2_auto_delete_days'
        ) {
          newInputs[item.key] = Number(item.value) || 0;
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
      showError(t('\u5237\u65b0\u5931\u8d25'));
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
