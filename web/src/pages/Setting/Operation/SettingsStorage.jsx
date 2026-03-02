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
        message: t('Connection test failed, please check network or server logs'),
        code: 'request_error',
      });
    } finally {
      setTesting(false);
    }
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) {
      return showWarning(t('No configuration changes detected'));
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
          return showError(t('Failed to save settings'));
        }
        showSuccess(t('Settings saved'));
        props.refresh();
      })
      .catch(() => {
        showError(t('Failed to save settings'));
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
        <Typography.Title heading={5}>{t('R2 Storage Settings')}</Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('When global video transfer is enabled, query APIs will prefer R2 links.')}
        </Typography.Text>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <Typography.Title heading={6}>{t('Global R2 Config')}</Typography.Title>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_account_id'
              label='Account ID'
              placeholder='Cloudflare Account ID'
              initValue={inputs['storage_setting.r2_account_id']}
              onChange={handleFieldChange('storage_setting.r2_account_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_access_key_id'
              label='Access Key ID'
              placeholder='R2 Access Key ID'
              initValue={inputs['storage_setting.r2_access_key_id']}
              onChange={handleFieldChange('storage_setting.r2_access_key_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_secret_access_key'
              label='Secret Access Key'
              mode='password'
              placeholder='R2 Secret Access Key'
              initValue={inputs['storage_setting.r2_secret_access_key']}
              onChange={handleFieldChange('storage_setting.r2_secret_access_key')}
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_bucket_name'
              label={t('Bucket Name')}
              placeholder={t('Enter R2 bucket name')}
              initValue={inputs['storage_setting.r2_bucket_name']}
              onChange={handleFieldChange('storage_setting.r2_bucket_name')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_custom_domain'
              label={t('Custom Domain')}
              placeholder='https://cloudflare.cdn.smv.buzz'
              initValue={inputs['storage_setting.r2_custom_domain']}
              onChange={handleFieldChange('storage_setting.r2_custom_domain')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.InputNumber
              field='storage_setting.r2_auto_delete_days'
              label={t('Auto Delete Days')}
              placeholder={t('0 means keep forever')}
              min={0}
              initValue={inputs['storage_setting.r2_auto_delete_days']}
              onChange={handleFieldChange('storage_setting.r2_auto_delete_days')}
            />
          </Col>
        </Row>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <Typography.Title heading={6}>{t('Global Video Transfer')}</Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('Enable one global switch. All transferable video/image links use unified R2 storage.')}
        </Typography.Text>

        <Row gutter={16} style={{ marginTop: 10 }}>
          <Col xs={12} sm={8} md={4} lg={4} xl={3}>
            <Form.Switch
              field='storage_setting.video_r2_enable'
              label={t('Enable Global Video Transfer')}
              checkedText='ON'
              uncheckedText='OFF'
              initValue={inputs['storage_setting.video_r2_enable']}
              onChange={handleFieldChange('storage_setting.video_r2_enable')}
            />
          </Col>
          <Col xs={24} sm={16} md={8} lg={8} xl={6}>
            <Form.Input
              field='storage_setting.video_r2_prefix'
              label={t('R2 Path Prefix')}
              placeholder='video'
              initValue={inputs['storage_setting.video_r2_prefix']}
              onChange={handleFieldChange('storage_setting.video_r2_prefix')}
            />
          </Col>
        </Row>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <Space>
          <Button size='default' onClick={onSubmit} loading={loading}>
            {t('Save Settings')}
          </Button>
          <Button size='default' theme='light' type='secondary' onClick={onTestConnection} loading={testing}>
            {t('Test R2 Connection')}
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
