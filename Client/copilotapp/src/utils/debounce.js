const createDebounce = (fn, wait = 500, options = {}) => {
  const {
    maxWait = wait * 2,
    accumulator = (acc, value) => value,
    initialValue = null,
  } = options;

  let timeoutId = null;
  let maxTimeoutId = null;
  let accumulated = initialValue;
  let lastCallTime = null;

  const clearTimeouts = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
  };

  const execute = async () => {
    const result = accumulated;
    clearTimeouts();
    accumulated = initialValue;
    lastCallTime = null;
    return await fn(result);
  };

  const debouncedFn = (value) => {
    const currentTime = Date.now();
    lastCallTime = currentTime;

    accumulated = accumulator(accumulated, value);
    clearTimeouts();

    timeoutId = setTimeout(execute, wait);

    if (!maxTimeoutId) {
      maxTimeoutId = setTimeout(() => {
        if (lastCallTime && (currentTime - lastCallTime >= maxWait)) {
          execute();
        }
      }, maxWait);
    }
  };

  debouncedFn.flush = execute;
  debouncedFn.cancel = () => {
    clearTimeouts();
    accumulated = initialValue;
    lastCallTime = null;
  };
  debouncedFn.getValue = () => accumulated;

  return debouncedFn;
};

export default createDebounce;