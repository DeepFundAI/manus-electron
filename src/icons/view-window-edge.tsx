import React from 'react';
import Icon from '@ant-design/icons';
import type { GetProps } from 'antd';

type CustomIconComponentProps = GetProps<typeof Icon>;

const ViewWindowEdgeSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="10px" height="10px" viewBox="0 0 10 10" version="1.1">
    <g id="version-8-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="group-14" transform="translate(-1364.000000, -914.000000)" fill="currentColor">
            <g id="group-2-backup-5" transform="translate(1069.000000, 914.000000)">
                <g id="group-79" transform="translate(272.500000, 5.000000) scale(-1, 1) rotate(-90.000000) translate(-272.500000, -5.000000) translate(267.500000, -27.500000)">
                    <path d="M8,0 C9.0543618,-1.9368312e-16 9.91816512,0.815877791 9.99451426,1.85073766 L10,2 L10,2 L10,10 L8,10 L8,2 L0,2 L0,0 L8,0 Z" id="combined-shape"/>
                </g>
            </g>
        </g>
    </g>
</svg>
)

const ViewWindowEdge = (props: Partial<CustomIconComponentProps>) => (
    <Icon component={ViewWindowEdgeSvg} {...props} />
)

export default ViewWindowEdge;