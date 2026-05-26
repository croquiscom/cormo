---
'cormo': patch
---

Store null as SQL NULL for object and array columns instead of the string `'null'`, so `$not: null` queries correctly match rows with values
