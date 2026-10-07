/** El instante actual; las páginas lo leen acá y se lo pasan a los componentes, así servidor e hidratación arman lo mismo. */
export const readClock = () => Date.now();
