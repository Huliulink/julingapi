import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Col,
  Form,
  Row,
  Spin,
  Typography,
  Divider,
} from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsStorage(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    'storage_setting.r2_account_id': '',
    'storage_setting.r2_access_key_id': '',
    'storage_setting.r2_secret_access_key': '',
    'storage_setting.r2_bucket_name': '',
    'storage_setting.r2_custom_domain': '',
    'storage_setting.r2_path_prefix': '',
    'storage_setting.r2_auto_delete_days': 0,
    'storage_setting.ali_r2_enable': false,
    'storage_setting.kling_r2_enable': false,
    'storage_setting.jimeng_r2_enable': false,
    'storage_setting.vidu_r2_enable': false,
    'storage_setting.doubao_r2_enable': false,
    'storage_setting.hailuo_r2_enable': false,
    'storage_setting.grok_r2_enable': false,
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((inputs) => ({ ...inputs, [fieldName]: value }));
    };
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = String(inputs[item.key]);
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (res.includes(undefined))
          return showError(t('部分保存失败，请重试'));
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    if (refForm.current) {
      refForm.current.setValues(currentInputs);
    }
  }, [props.options]);

  return (
    <Spin spinning={loading}>
      <Form
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        <Typography.Title heading={5}>
          {t('R2 云存储设置')}
        </Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('R2 云存储设置说明')}
        </Typography.Text>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />

        <Typography.Title heading={6}>
          {t('全局配置')}
        </Typography.Title>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_account_id'
              label='Account ID'
              placeholder={t('输入 Cloudflare Account ID')}
              initValue={inputs['storage_setting.r2_account_id']}
              onChange={handleFieldChange('storage_setting.r2_account_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_access_key_id'
              label='Access Key ID'
              placeholder={t('输入 R2 Access Key ID')}
              initValue={inputs['storage_setting.r2_access_key_id']}
              onChange={handleFieldChange('storage_setting.r2_access_key_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_secret_access_key'
              label='Secret Access Key'
              mode='password'
              placeholder={t('输入 R2 Secret Access Key')}
              initValue={inputs['storage_setting.r2_secret_access_key']}
              onChange={handleFieldChange('storage_setting.r2_secret_access_key')}
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_bucket_name'
              label={t('Bucket 名称')}
              placeholder={t('输入 R2 Bucket 名称')}
              initValue={inputs['storage_setting.r2_bucket_name']}
              onChange={handleFieldChange('storage_setting.r2_bucket_name')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_custom_domain'
              label={t('自定义域名')}
              placeholder='https://video.example.com'
              initValue={inputs['storage_setting.r2_custom_domain']}
              onChange={handleFieldChange('storage_setting.r2_custom_domain')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_path_prefix'
              label={t('存储路径前缀')}
              placeholder={t('可选，如 videos')}
              initValue={inputs['storage_setting.r2_path_prefix']}
              onChange={handleFieldChange('storage_setting.r2_path_prefix')}
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.InputNumber
              field='storage_setting.r2_auto_delete_days'
              label={t('自动删除天数')}
              placeholder={t('0 表示永久保存')}
              min={0}
              initValue={inputs['storage_setting.r2_auto_delete_days']}
              onChange={handleFieldChange('storage_setting.r2_auto_delete_days')}
            />
          </Col>
        </Row>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />

        <Typography.Title heading={6}>
          {t('平台 R2 转存开关')}
        </Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('平台 R2 转存开关说明')}
        </Typography.Text>

        <Row gutter={16} style={{ marginTop: 10 }}>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.ali_r2_enable'
              label={t('通义万相')}
              checkedText='|'
              uncheckedText='〇'
              initValue={inputs['storage_setting.ali_r2_enable']}
              onChange={handleFieldChange('storage_setting.ali_r2_enable')}
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.kling_r2_enable'
              label={t('可灵')}
              checkedText='|'
              uncheckedText='〇'
              initValue={inputs['storage_setting.kling_r2_enable']}
              onChange={handleFieldChange('storage_setting.kling_r2_enable')}
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.jimeng_r2_enable'
              label={t('即梦')}
              checkedText='|'
              uncheckedText='〇'
              initValue={inputs['storage_setting.jimeng_r2_enable']}
              onChange={handleFieldChange('storage_setting.jimeng_r2_enable')}
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.vidu_r2_enable'
              label='Vidu'
              checkedText='|'
              uncheckedText='〇'
              initValue={inputs['storage_setting.vidu_r2_enable']}
              onChange={handleFieldChange('storage_setting.vidu_r2_enable')}
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.doubao_r2_enable'
              label={t('豆包')}
              checkedText='|'
              uncheckedText='〇'
              initValue={inputs['storage_setting.doubao_r2_enable']}
              onChange={handleFieldChange('storage_setting.doubao_r2_enable')}
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.hailuo_r2_enable'
              label={t('海螺')}
              checkedText='|'
              uncheckedText='〇'
              initValue={inputs['storage_setting.hailuo_r2_enable']}
              onChange={handleFieldChange('storage_setting.hailuo_r2_enable')}
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.grok_r2_enable'
              label='Grok'
              checkedText='|'
              uncheckedText='〇'
              initValue={inputs['storage_setting.grok_r2_enable']}
              onChange={handleFieldChange('storage_setting.grok_r2_enable')}
            />
          </Col>
        </Row>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />

        <Button size='default' onClick={onSubmit} loading={loading}>
          {t('保存存储设置')}
        </Button>
      </Form>
    </Spin>
  );
}
