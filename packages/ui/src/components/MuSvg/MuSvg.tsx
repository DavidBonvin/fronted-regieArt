import React from 'react';

import { SvgrComponent } from '../../Types/common';

export const MuSvg: React.FC<{
    SvgComp: SvgrComponent;
    className?: string;
}> = ({ SvgComp, className = '' }) => <SvgComp className={`mu-svg ${className || ''}`} />;
