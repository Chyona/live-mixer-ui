import { Flex } from 'antd';
import { appConfig } from '~/utils/config';
import { useResponsive } from '~/hooks';

const Footer = () => {
  const { isMobile } = useResponsive();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#f8fafc] text-[#718096] py-4">
      <Flex
        className="container text-xs"
        align="center"
        justify="center"
        gap={12}
        vertical={isMobile}
      >
        <span>
          &copy; {year} {appConfig.companyName}
        </span>
      </Flex>
    </footer>
  );
};

export default Footer;
