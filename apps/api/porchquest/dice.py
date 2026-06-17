from __future__ import annotations

import random
import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class RollResult:
    expr: str
    rolls: list[int]
    modifier: int
    total: int
    dc: Optional[int] = None
    outcome: str = "ROLLED"
    detail: str = ""
    seed: Optional[int] = None


def lcg_next(seed: int) -> int:
    """Small deterministic LCG retained from the Porch GameMaster idea."""
    return (int(seed) * 1103515245 + 12345) & 0x7FFFFFFF


def d20(mod: int = 0, dc: int = 10, seed: Optional[int] = None, advantage: str = "normal") -> RollResult:
    """Roll a d20 with optional deterministic campaign seed."""
    rolls: list[int] = []
    cur_seed = seed
    count = 2 if advantage in {"advantage", "disadvantage"} else 1
    for _ in range(count):
        if cur_seed is None:
            rolls.append(random.randint(1, 20))
        else:
            cur_seed = lcg_next(cur_seed)
            rolls.append((cur_seed % 20) + 1)

    if advantage == "advantage":
        raw = max(rolls)
    elif advantage == "disadvantage":
        raw = min(rolls)
    else:
        raw = rolls[0]

    total = raw + int(mod)
    if raw == 20:
        outcome = "CRITICAL SUCCESS"
    elif raw == 1:
        outcome = "CRITICAL FAILURE"
    else:
        outcome = "SUCCESS" if total >= int(dc) else "FAILURE"

    return RollResult(
        expr=f"1d20{mod:+d}",
        rolls=rolls,
        modifier=int(mod),
        total=total,
        dc=int(dc),
        outcome=outcome,
        detail=f"d20={raw}, mod={mod:+d}, total={total}, dc={dc}",
        seed=cur_seed,
    )


ROLL_RE = re.compile(r"^\s*(?P<n>\d*)d(?P<sides>\d+)(?P<mod>[+-]\d+)?\s*$", re.I)


def roll_expr(expr: str, dc: Optional[int] = None, seed: Optional[int] = None) -> RollResult:
    """Roll NdM+K. Kept intentionally simple and transparent."""
    expr = (expr or "1d20").strip().lower()
    m = ROLL_RE.match(expr)
    if not m:
        raise ValueError("Use dice notation like 1d20+3, d6, or 2d8-1.")
    n = int(m.group("n") or 1)
    sides = int(m.group("sides"))
    mod = int(m.group("mod") or 0)
    if n < 1 or n > 20:
        raise ValueError("Dice count must be between 1 and 20.")
    if sides < 2 or sides > 1000:
        raise ValueError("Dice sides must be between 2 and 1000.")

    rolls: list[int] = []
    cur_seed = seed
    for _ in range(n):
        if cur_seed is None:
            rolls.append(random.randint(1, sides))
        else:
            cur_seed = lcg_next(cur_seed)
            rolls.append((cur_seed % sides) + 1)
    total = sum(rolls) + mod
    outcome = "ROLLED"
    if dc is not None:
        if sides == 20 and n == 1 and rolls[0] == 20:
            outcome = "CRITICAL SUCCESS"
        elif sides == 20 and n == 1 and rolls[0] == 1:
            outcome = "CRITICAL FAILURE"
        else:
            outcome = "SUCCESS" if total >= dc else "FAILURE"

    return RollResult(
        expr=expr,
        rolls=rolls,
        modifier=mod,
        total=total,
        dc=dc,
        outcome=outcome,
        detail=f"{rolls} {mod:+d} = {total}" if mod else f"{rolls} = {total}",
        seed=cur_seed,
    )
