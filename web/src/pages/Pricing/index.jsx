/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import ModelPricingPage from '../../components/table/model-pricing/layout/PricingPage';
import FooterBar from '../../components/layout/Footer';
import { useActualTheme } from '../../context/Theme';
import './Pricing.css';

const Pricing = () => {
  const theme = useActualTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`pricing-container ${isDark ? 'dark-theme' : ''}`}>
      <ModelPricingPage />
      <FooterBar />
    </div>
  );
};

export default Pricing;
