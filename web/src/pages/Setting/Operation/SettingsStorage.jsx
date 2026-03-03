import React, { useEffect, useRef, useState } from 'react';
import { Banner, Button, Col, Divider, Form, Row, Space, Spin, Typography } from '@douyinfe/semi-ui';
import { API, compareObjects, showError, showSuccess, showWarning } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const STORAGE_DEFAULTS = {
  'storage_setting.r2_account_id': '',
  'storage_setting.r2_access_key_id': '',
  'storage_setting.r2_secret_access_key': '',
  'storage_setting.r2_bucket_name': '',
  'storage_setting.r2_custom_domain': '',
  'storage_setting.r2_auto_delete_days': 0,
  'storage_setting.video_r2_enable': false,
  'storage_setting.video_r2_prefix': 'video',
  'storage_setting.playground_forward_enable': true,
};

export default function SettingsStorage(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [inputs, setInputs] = useState(STORAGE_DEFAULTS);
  const [inputsRow, setInputsRow] = useState(inputs);
  const refForm = useRef();

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((prev) => ({ ...prev, [fieldName]: value }));
    };
  }

  async function onTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await API.get('/api/storage/test');
      const { success, message, code } = res.data;
      setTestResult({ success, message, code });
    } catch (e) {
      setTestResult({
        success: false,
        message: t('请求失败，请检查网络或服务器状态'),
        code: 'request_error',
      });
    } finally {
      setTesting(false);
    }
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) {
      return showWarning(t('你似乎并没有修改什么'));
    }

    const requestQueue = updateArray.map((item) =>
      API.put('/api/storage/options', {
        key: item.key,
        value: String(inputs[item.key]),
      }),
    );

    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (res.includes(undefined)) {
          return showError(t('设置保存失败'));
        }
        showSuccess(t('设置已保存'));
        props.refresh();
      })
      .catch(() => {
        showError(t('设置保存失败'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = { ...STORAGE_DEFAULTS };
    for (const key in STORAGE_DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(props.options, key)) {
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
      <Form getFormApi={(formAPI) => (refForm.current = formAPI)} style={{ marginBottom: 15 }}>
        <Typography.Title heading={5}>{t('R2 云存储设置')}</Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('R2 云存储设置说明')}
        </Typography.Text>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <Typography.Title heading={6}>{t('全局配置')}</Typography.Title>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_account_id'
              label={t('输入 Cloudflare Account ID')}
              placeholder={t('输入 Cloudflare Account ID')}
              initValue={inputs['storage_setting.r2_account_id']}
              onChange={handleFieldChange('storage_setting.r2_account_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_access_key_id'
              label={t('输入 R2 Access Key ID')}
              placeholder={t('输入 R2 Access Key ID')}
              initValue={inputs['storage_setting.r2_access_key_id']}
              onChange={handleFieldChange('storage_setting.r2_access_key_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_secret_access_key'
              label={t('输入 R2 Secret Access Key')}
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
              placeholder='https://cloudflare.cdn.smv.buzz'
              initValue={inputs['storage_setting.r2_custom_domain']}
              onChange={handleFieldChange('storage_setting.r2_custom_domain')}
            />
          </Col>
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
        <Typography.Title heading={6}>{t('平台 R2 转存开关')}</Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('平台 R2 转存开关说明')}
        </Typography.Text>

        <Row gutter={16} style={{ marginTop: 10 }}>
          <Col xs={12} sm={8} md={4} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.video_r2_enable'
              label={t('平台 R2 转存开关')}
              checkedText='ON'
              uncheckedText='OFF'
              initValue={inputs['storage_setting.video_r2_enable']}
              onChange={handleFieldChange('storage_setting.video_r2_enable')}
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.playground_forward_enable'
              label={t('\u64cd\u7ec3\u573a\u8f6c\u53d1\u5f00\u5173')}
              checkedText='ON'
              uncheckedText='OFF'
              initValue={inputs['storage_setting.playground_forward_enable']}
              onChange={handleFieldChange('storage_setting.playground_forward_enable')}
            />
          </Col>
          <Col xs={24} sm={16} md={8} lg={8} xl={6}>
            <Form.Input
              field='storage_setting.video_r2_prefix'
              label={t('存储路径前缀')}
              placeholder='video'
              initValue={inputs['storage_setting.video_r2_prefix']}
              onChange={handleFieldChange('storage_setting.video_r2_prefix')}
            />
          </Col>
        </Row>
        <Typography.Text type='tertiary' size='small'>
          {t('\u64cd\u7ec3\u573a\u8f6c\u53d1\u5f00\u5173\u8bf4\u660e')}
        </Typography.Text>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <Space>
          <Button size='default' onClick={onSubmit} loading={loading}>
            {t('保存存储设置')}
          </Button>
          <Button size='default' theme='light' type='secondary' onClick={onTestConnection} loading={testing}>
            {t('测试 R2 连接')}
          </Button>
        </Space>

        {testResult && (
          <Banner
            style={{ marginTop: 16 }}
            type={testResult.success ? 'success' : 'danger'}
            description={testResult.message}
            closeIcon={null}
          />
        )}
      </Form>
    </Spin>
  );
}
