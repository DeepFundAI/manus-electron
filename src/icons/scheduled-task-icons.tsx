import React from 'react';
import Icon from '@ant-design/icons';
import type { GetProps } from 'antd';

type CustomIconComponentProps = GetProps<typeof Icon>;

/**
 * Scheduled task icon - calendar + clock
 */
const ScheduledTaskSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 18 18" version="1.1">
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd" opacity="0.85">
      <g transform="translate(1.5, 1.5)" fill="#FFFFFF" fillRule="nonzero">
        <path d="M12,0 C13.6568542,0 15,1.34314575 15,3 L15,12 C15,13.6568542 13.6568542,15 12,15 L3,15 C1.34314575,15 0,13.6568542 0,12 L0,3 C0,1.34314575 1.34314575,0 3,0 L12,0 Z M12,1.2 L3,1.2 C2.00588745,1.2 1.2,2.00588745 1.2,3 L1.2,12 C1.2,12.9941125 2.00588745,13.8 3,13.8 L12,13.8 C12.9941125,13.8 13.8,12.9941125 13.8,12 L13.8,3 C13.8,2.00588745 12.9941125,1.2 12,1.2 Z M10.5,6 C11.3284271,6 12,6.67157288 12,7.5 C12,8.32842712 11.3284271,9 10.5,9 C9.67157288,9 9,8.32842712 9,7.5 C9,6.67157288 9.67157288,6 10.5,6 Z M10.5,7 C10.2238576,7 10,7.22385763 10,7.5 C10,7.77614237 10.2238576,8 10.5,8 C10.7761424,8 11,7.77614237 11,7.5 C11,7.22385763 10.7761424,7 10.5,7 Z M7.5,7 L7.5,8 L4.5,8 L4.5,7 L7.5,7 Z M10.5,10 L10.5,11 L4.5,11 L4.5,10 L10.5,10 Z M10.5,3.5 L10.5,5 L4.5,5 L4.5,3.5 L10.5,3.5 Z"/>
      </g>
    </g>
  </svg>
);

/**
 * Create task icon (with plus sign)
 */
const CreateTaskSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 18 18" version="1.1">
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd" opacity="0.85">
      <g transform="translate(2, 2)" fill="#FFFFFF">
        <path d="M7,0 C10.8659932,0 14,3.13400675 14,7 C14,10.8659932 10.8659932,14 7,14 C3.13400675,14 0,10.8659932 0,7 C0,3.13400675 3.13400675,0 7,0 Z M7,1.16666667 C3.77834064,1.16666667 1.16666667,3.77834064 1.16666667,7 C1.16666667,10.2216594 3.77834064,12.8333333 7,12.8333333 C10.2216594,12.8333333 12.8333333,10.2216594 12.8333333,7 C12.8333333,3.77834064 10.2216594,1.16666667 7,1.16666667 Z M7,3.5 C7.32217184,3.5 7.58333333,3.76116149 7.58333333,4.08333333 L7.58333333,6.41666667 L9.91666667,6.41666667 C10.2388385,6.41666667 10.5,6.67782816 10.5,7 C10.5,7.32217184 10.2388385,7.58333333 9.91666667,7.58333333 L7.58333333,7.58333333 L7.58333333,9.91666667 C7.58333333,10.2388385 7.32217184,10.5 7,10.5 C6.67782816,10.5 6.41666667,10.2388385 6.41666667,9.91666667 L6.41666667,7.58333333 L4.08333333,7.58333333 C3.76116149,7.58333333 3.5,7.32217184 3.5,7 C3.5,6.67782816 3.76116149,6.41666667 4.08333333,6.41666667 L6.41666667,6.41666667 L6.41666667,4.08333333 C6.41666667,3.76116149 6.67782816,3.5 7,3.5 Z"/>
      </g>
    </g>
  </svg>
);

// Export icon components
export const ScheduledTaskIcon = (props: Partial<CustomIconComponentProps>) => (
  <Icon component={ScheduledTaskSvg} {...props} />
);

export const CreateTaskIcon = (props: Partial<CustomIconComponentProps>) => (
  <Icon component={CreateTaskSvg} {...props} />
);
