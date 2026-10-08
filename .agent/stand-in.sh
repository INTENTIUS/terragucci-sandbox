#!/bin/sh
# The sandbox's stand-in agent: the prompt comes on stdin, and it makes one
# edit with no model. An ask that says "touch ci" also edits the pipeline,
# which terragucci must refuse to push.
ask="$(sed -n '/^<ask>$/,/^<\/ask>$/p')"
echo "stand-in agent asked: $ask"
printf '\n# The orders team is on call for this root.\n' >> envs/dev/orders/main.tf
case "$ask" in
  *"touch ci"*) echo "# the stand-in agent was here" >> .github/workflows/terragucci.yml ;;
esac
