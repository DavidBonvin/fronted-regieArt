import React from 'react';

import { MuSvg } from '../MuSvg';
import * as Icons from '../../icons';
import { SvgrComponent } from '../../Types/common';

export type MuIconProps = {
    className?: string;
    svg?: SvgrComponent;
    svgName?: keyof typeof Icons;
};

const MuIcon: React.FC<MuIconProps> = ({ className, svg, svgName }) => {
    let component = svg;
    if (!component && svgName) {
        component = Icons[svgName];
    }

    if (!component) return null;

    return <MuSvg className={className} SvgComp={component} />;
};

export default MuIcon;
